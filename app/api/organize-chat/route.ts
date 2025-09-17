import { NextRequest, NextResponse } from 'next/server';
import { organizeConversation } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file',
        messages: []
      }, { status: 200 }); // Return 200 to prevent app crash
    }

    const { chatData, transcriptions } = await request.json();

    if (!chatData || !Array.isArray(chatData)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    console.log('Organizing conversation with Gemini AI...');
    console.log('Chat messages:', chatData.length);
    console.log('Transcriptions:', Object.keys(transcriptions).length);

    const organizedConversation = await organizeConversation(chatData, transcriptions);
    
    return NextResponse.json(organizedConversation);
  } catch (error) {
    console.error('Organization error:', error);
    return NextResponse.json(
      { error: `Failed to organize conversation: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}