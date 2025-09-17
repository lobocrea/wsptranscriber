import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioWithOpenAI } from '@/lib/openai-transcription';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file',
        transcription: '[Error: OpenAI API key not configured]'
      }, { status: 200 }); // Return 200 to continue processing
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const fileName = formData.get('fileName') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`Processing audio file: ${fileName || audioFile.name}`);

    // Transcribe with OpenAI Whisper
    const transcription = await transcribeAudioWithOpenAI(audioFile);
    
    return NextResponse.json({ 
      transcription,
      fileName: fileName || audioFile.name
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}