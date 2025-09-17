import { NextRequest, NextResponse } from 'next/server';
import { organizeConversation } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('Gemini API key not configured, creating fallback response...');
      
      const { chatData, transcriptions } = await request.json();
      
      // Create a simple organized structure without AI
      const organizedMessages = chatData.map((msg: any) => {
        const hasTranscription = msg.mediaFile && transcriptions && transcriptions[msg.mediaFile];
        
        if (msg.type === 'audio' && hasTranscription) {
          return {
            timestamp: msg.timestamp,
            sender: msg.sender,
            content: transcriptions[msg.mediaFile],
            type: 'audio_transcript',
            originalFile: msg.mediaFile,
            transcription: transcriptions[msg.mediaFile]
          };
        } else if (msg.type === 'audio') {
          return {
            timestamp: msg.timestamp,
            sender: msg.sender,
            content: '[Audio sin transcribir]',
            type: 'audio',
            originalFile: msg.mediaFile,
            transcription: '[Audio sin transcribir]'
          };
        } else {
          return {
            timestamp: msg.timestamp,
            sender: msg.sender,
            content: msg.content,
            type: msg.type,
            originalFile: msg.mediaFile,
            transcription: undefined
          };
        }
      });

      return NextResponse.json({ 
        messages: organizedMessages,
        summary: `Conversación organizada sin IA - ${Object.keys(transcriptions || {}).length} audios procesados`,
        fallback: true
      }, { status: 200 });
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