import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Test API endpoint called');
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('Test API POST endpoint called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'POST API is working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
