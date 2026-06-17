import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyItemAntifalsificacion } from '@/actions/antifraud/verify-item';
import { decodeUrlParam } from '@/lib/api/decode-param';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  try {

    if (!rawCode) {
      return NextResponse.json(
        { error: 'Código requerido' },
        { status: 400 }
      );
    }

    // Decode the code parameter in case it's URL-encoded
    const code = decodeUrlParam(rawCode);
    console.log('[Verify API] Looking for item with ID:', code);

    // Buscar el item por ID (asumiendo que el código es el ID del item)
    const item = await prisma.item.findUnique({
      where: {
        id: code,
      },
      include: {
        ItemCategory: {
          include: {
            Category: true
          }
        },
        User: {
          select: {
            name: true,
            email: true,
          }
        },
        State: {
          include: {
            StatusType: true,
            User: {
              select: {
                name: true,
                email: true,
              }
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Verificación antifalsificación automática - ESTE ES EL TRIGGER
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Si no está verificado, realizar verificación
    let isFirstVerification = !item.antifraudEvidenceId;
    let antifraudEvidenceId = item.antifraudEvidenceId;
    
    if (!item.antifraudEvidenceId) {
      console.log('[Verify API] Item not verified, starting verification process');
      try {
        const verificationResult = await verifyItemAntifalsificacion(code, {
          ipAddress,
          userAgent,
        });
        
        console.log('[Verify API] Verification result:', verificationResult);
        
        if (verificationResult.success && verificationResult.data) {
          // Re-fetch item to get updated antifraudEvidenceId
          const updatedItem = await prisma.item.findUnique({
            where: { id: code },
            select: { antifraudEvidenceId: true },
          });
          console.log('[Verify API] Updated item from DB:', updatedItem);
          
          if (updatedItem) {
            antifraudEvidenceId = updatedItem.antifraudEvidenceId;
            isFirstVerification = verificationResult.data.isFirstVerification;
            console.log('[Verify API] Final values - antifraudEvidenceId:', antifraudEvidenceId, 'isFirstVerification:', isFirstVerification);
          } else {
            console.warn('[Verify API] Updated item not found after verification');
          }
        } else {
          console.error('[Verify API] Verification failed:', verificationResult.error);
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('[Verify API] Exception in verification antifraude:', error);
        if (error instanceof Error) {
          console.error('[Verify API] Error stack:', error.stack);
        }
      }
    } else {
      console.log('[Verify API] Item already verified, antifraudEvidenceId:', item.antifraudEvidenceId);
    }

    // Transformar los datos para el frontend
    const transformedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      templateFields: item.templateFields,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      evidenceID: (item as any).evidenceID || null,
      antifraudEvidenceId: antifraudEvidenceId || null,
      isFirstVerification: isFirstVerification,
      createdBy: item.User || null,
      category: item.ItemCategory.length > 0 ? {
        id: item.ItemCategory[0].Category.id,
        name: item.ItemCategory[0].Category.name,
        description: item.ItemCategory[0].Category.description,
      } : {
        id: '',
        name: 'Sin categoría',
        description: '',
      },
      states: item.State.map((state) => ({
        id: state.id,
        title: state.title,
        description: state.description,
        evidenceID: state.evidenceID,
        backed: state.backed,
        backedAt: state.backedAt,
        imageUrls: state.imageUrls,
        templateConfig: state.templateConfig,
        createdAt: state.createdAt,
        createdBy: state.User || null,
        statusType: {
          id: state.StatusType.id,
          name: state.StatusType.name,
          description: state.StatusType.description,
        },
      })),
    };

    return NextResponse.json(transformedItem);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
