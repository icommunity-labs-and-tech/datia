import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward the webhook to our notification system
    const notificationResponse = await fetch(`${req.nextUrl.origin}/api/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: body.event || 'unknown',
        data: body.data || {},
        timestamp: new Date().toISOString(),
      }),
    });

    if (!notificationResponse.ok) {
      throw new Error('Failed to process notification');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 