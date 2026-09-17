import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Sencillo limitador por IP en memoria (reinicia con el proceso)
type Bucket = { count: number; resetAt: number };
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 20; // 20 req/min por IP
const ipBuckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // NextRequest ya no expone `ip` (Next 15); detrás de Cloud Run siempre
  // llega x-forwarded-for.
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count < RATE_LIMIT_MAX) {
    bucket.count += 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ statusId: string }> }
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
    );
  }

  const { statusId } = await params;
  if (!statusId || typeof statusId !== 'string') {
    return NextResponse.json({ error: 'Parámetro statusId inválido' }, { status: 400 });
  }

  // Buscar el estado para obtener el evidenceID
  const state = await prisma.state.findUnique({
    where: { id: statusId },
    select: { id: true, title: true, evidenceID: true, imageUrls: true, issueDataJson: true },
  });

  if (!state) {
    return NextResponse.json({ error: 'Estado no encontrado' }, { status: 404 });
  }

  const evidenceId = state.evidenceID;
  if (!evidenceId) {
    return NextResponse.json({ error: 'El estado no tiene evidencia asociada' }, { status: 422 });
  }

  // Consultar checker público de iCommunity con timeout 30s
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);
  try {
    const url = `https://api.icommunitylabs.com/checker/evds/${encodeURIComponent(evidenceId)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo recuperar la evidencia (${res.status})` },
        { status: 502 }
      );
    }
    const data = await res.json();

    // Preparar activos locales para verificación (URLs de imágenes y JSON embebido)
    const localAssets: { name: string; url?: string; inline?: string }[] = [];
    try {
      const imgs = Array.isArray(state.imageUrls)
        ? (state.imageUrls as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      imgs.forEach((u, i) => {
        const name = u.split('/').pop() || `image_${i + 1}`;
        localAssets.push({ name, url: u });
      });
    } catch {}

    if (state.issueDataJson) {
      localAssets.push({ name: 'issue_data.json', inline: state.issueDataJson });
    }

    return NextResponse.json({ evidenceId, stateTitle: state.title, data, localAssets });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Tiempo de espera excedido (30s)' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Error al consultar el checker' }, { status: 500 });
  } finally {
    clearTimeout(t);
  }
}


