import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decodeUrlParam } from '@/lib/api/decode-param';

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
  try {
    return (req as any).ip || 'unknown';
  } catch {
    return 'unknown';
  }
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
  { params }: { params: Promise<{ itemId: string }> }
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
    );
  }

  const { itemId: rawItemId } = await params;
  if (!rawItemId || typeof rawItemId !== 'string') {
    return NextResponse.json({ error: 'Parámetro itemId inválido' }, { status: 400 });
  }

  const itemId = decodeUrlParam(rawItemId);

  // Buscar el item para obtener el evidenceID
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, evidenceID: true, evidenceDataJson: true, imageUrl: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
  }

  const evidenceId = item.evidenceID;
  if (!evidenceId) {
    return NextResponse.json({ error: 'El item no tiene evidencia asociada' }, { status: 422 });
  }

  // Consultar checker público de iCommunity con timeout 30s
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);
  try {
    const url = `https://api.icommunitylabs.com/checker/evds/${encodeURIComponent(evidenceId)}`;
    console.log(`[Checker] Fetching evidence: ${url}`);
    const res = await fetch(url, { signal: controller.signal });
    console.log(`[Checker] Response status: ${res.status}, content-type: ${res.headers.get('content-type')}`);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No response body');
      console.error(`[Checker] API error: ${res.status} - ${errorText}`);
      return NextResponse.json(
        { error: `No se pudo recuperar la evidencia (${res.status})` },
        { status: 502 }
      );
    }
    
    // Intentar parsear el JSON incluso si el content-type es text/plain
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Checker] Successfully parsed evidence data`);
    } catch (parseError) {
      console.error(`[Checker] JSON parse error:`, parseError);
      return NextResponse.json(
        { error: 'Error al parsear la respuesta de la evidencia' },
        { status: 502 }
      );
    }

    // Preparar activos locales para verificación (URLs de imagen y JSON embebido)
    const localAssets: { name: string; url?: string; inline?: string }[] = [];
    
    // Añadir imagen del item si existe
    if (item.imageUrl) {
      const name = item.imageUrl.split('/').pop() || 'item_image';
      localAssets.push({ name, url: item.imageUrl });
    }

    // Añadir evidenceDataJson si existe
    if (item.evidenceDataJson) {
      localAssets.push({ name: 'item_data.json', inline: item.evidenceDataJson });
    }

    return NextResponse.json({ evidenceId, itemName: item.name, data, localAssets });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Tiempo de espera excedido (30s)' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Error al consultar el checker' }, { status: 500 });
  } finally {
    clearTimeout(t);
  }
}


