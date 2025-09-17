import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioWithGemini } from '@/lib/gemini-transcription';

export async function POST(request: NextRequest) {
  try {
    console.log('Gemini transcription API called');
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file',
        transcription: '[Error: Gemini API key not configured]'
      }, { status: 200 }); // Return 200 to continue processing
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const fileName = formData.get('fileName') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`Processing audio file with Gemini: ${fileName || audioFile.name}`);
    console.log(`File size: ${audioFile.size} bytes`);
    console.log(`File type: ${audioFile.type}`);

    // Check file size (Gemini has limits, usually around 20MB)
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB
    if (audioFile.size > maxSizeBytes) {
      return NextResponse.json({
        error: `File too large for Gemini (${Math.round(audioFile.size / 1024 / 1024)}MB). Maximum: 20MB`,
        transcription: `[Archivo demasiado grande: ${Math.round(audioFile.size / 1024 / 1024)}MB]`
      }, { status: 200 });
    }

    // Transcribe with Gemini AI
    const transcription = await transcribeAudioWithGemini(audioFile);
    
    return NextResponse.json({ 
      transcription,
      fileName: fileName || audioFile.name,
      provider: 'gemini',
      fileSize: audioFile.size
    });
  } catch (error) {
    console.error('Gemini transcription error:', error);
    return NextResponse.json(
      { 
        error: `Failed to transcribe audio with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transcription: `[Error con Gemini: ${error instanceof Error ? error.message : 'Error desconocido'}]`
      }, 
      { status: 500 }
    );
  }
}
