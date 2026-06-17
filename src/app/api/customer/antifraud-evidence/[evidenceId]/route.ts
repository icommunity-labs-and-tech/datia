import { NextRequest, NextResponse } from 'next/server';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { ICommunityConfigError, ICommunityHTTPError } from '@/infrastructure/icommunity/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { evidenceId } = await params;
  
  if (!evidenceId || evidenceId === 'NO_SIGNATURE') {
    return NextResponse.json(
      { error: 'Evidence ID inválido' },
      { status: 400 }
    );
  }

  try {
    console.log('[Antifraud Evidence] Fetching evidence from IBS API:', evidenceId);
    const evidence = await icommunityService.getEvidence(evidenceId);
    
    // Log full structure for debugging (truncated for large objects)
    console.log('[Antifraud Evidence] Evidence structure:', {
      id: evidence.id,
      hasPayload: !!evidence.payload,
      hasData: !!evidence.data,
      timestamp: evidence.timestamp,
      payloadKeys: evidence.payload ? Object.keys(evidence.payload) : [],
      dataKeys: evidence.data ? Object.keys(evidence.data) : [],
      allKeys: Object.keys(evidence),
    });

    // Extract relevant information from evidence
    // According to IBS API structure:
    // - Evidence metadata is in payload.files (base64 encoded JSON files)
    // - Evidence timestamp/date is in timestamp or createdAt fields
    // - Additional data may be in data field
    let metadata: any = {};
    let verificationDate: string | null = null;
    let evidenceDate: string | null = null;
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    // 1. Try to extract metadata from payload files
    // The antifraud verification data is stored in antifraud_verification.json
    if (evidence.payload?.files && Array.isArray(evidence.payload.files)) {
      const antifraudFile = evidence.payload.files.find(
        (f: any) => f.name === 'antifraud_verification.json'
      );
      
      if (antifraudFile && antifraudFile.file) {
        try {
          // Files are base64 encoded, decode and parse
          const fileContent = Buffer.from(antifraudFile.file, 'base64').toString('utf-8');
          metadata = JSON.parse(fileContent);
          verificationDate = metadata.verificationDate || null;
          ipAddress = metadata.ipAddress || null;
          userAgent = metadata.userAgent || null;
          console.log('[Antifraud Evidence] Successfully parsed metadata from antifraud_verification.json:', {
            verificationDate,
            ipAddress: ipAddress ? `${ipAddress.substring(0, 10)}...` : null,
            userAgent: userAgent ? `${userAgent.substring(0, 30)}...` : null,
          });
        } catch (e) {
          console.error('[Antifraud Evidence] Error parsing antifraud_verification.json:', e);
        }
      } else {
        console.log('[Antifraud Evidence] antifraud_verification.json not found. Available files:', 
          evidence.payload.files.map((f: any) => f.name));
      }
    }

    // 2. Extract evidence date from multiple possible locations
    // Priority: timestamp > certification timestamp > verificationDate
    evidenceDate = evidence.timestamp || 
                   (evidence as any).certification?.timestamp ||
                   (evidence as any).certified_at ||
                   verificationDate ||
                   null;

    // 3. Fallback: Try to extract from data field if available
    if (!verificationDate && evidence.data) {
      if (typeof evidence.data === 'object') {
        verificationDate = evidence.data.verificationDate || 
                          evidence.data.timestamp || 
                          null;
        if (!ipAddress) ipAddress = evidence.data.ipAddress || null;
        if (!userAgent) userAgent = evidence.data.userAgent || null;
      }
    }

    // 4. Fallback: Try to extract from payload directly (if not in files)
    if (!verificationDate && evidence.payload && typeof evidence.payload === 'object') {
      const payload = evidence.payload as any;
      if (payload.verificationDate) verificationDate = payload.verificationDate;
      if (!ipAddress && payload.ipAddress) ipAddress = payload.ipAddress;
      if (!userAgent && payload.userAgent) userAgent = payload.userAgent;
    }

    const result = {
      verificationDate,
      evidenceDate,
      ipAddress,
      userAgent,
      evidenceId,
    };

    console.log('[Antifraud Evidence] Final extracted data:', {
      verificationDate: verificationDate ? new Date(verificationDate).toISOString() : null,
      evidenceDate: evidenceDate ? new Date(evidenceDate).toISOString() : null,
      hasIpAddress: !!ipAddress,
      hasUserAgent: !!userAgent,
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Antifraud Evidence] Error:', error);
    
    if (error instanceof ICommunityConfigError) {
      return NextResponse.json(
        { error: 'Error de configuración: ' + error.message },
        { status: 500 }
      );
    }
    
    if (error instanceof ICommunityHTTPError) {
      const statusCode = error.status ?? 500;
      return NextResponse.json(
        { error: `Error al obtener la evidencia: ${error.message}` },
        { status: statusCode >= 500 ? 502 : statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener la evidencia' },
      { status: 500 }
    );
  }
}
