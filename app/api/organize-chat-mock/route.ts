import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Mock organization API called');
    
    const { chatData, transcriptions } = await request.json();

    if (!chatData || !Array.isArray(chatData)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    console.log('Organizing conversation with mock AI...');
    console.log('Chat messages:', chatData.length);
    console.log('Transcriptions:', Object.keys(transcriptions || {}).length);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create organized data with transcriptions integrated
    const organizedMessages = chatData.map(msg => {
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

    const organizedData = {
      messages: organizedMessages,
      summary: `Conversación organizada con ${Object.keys(transcriptions || {}).length} audios transcritos (simulado)`,
      mock: true
    };
    
    return NextResponse.json(organizedData);
  } catch (error) {
    console.error('Mock organization error:', error);
    return NextResponse.json(
      { error: `Failed to organize conversation: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}
