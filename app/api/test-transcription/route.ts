import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test transcription API called');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const fileName = formData.get('fileName') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`Mock transcribing: ${fileName || audioFile.name} (${audioFile.size} bytes)`);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock transcription based on filename
    const mockTranscriptions: Record<string, string> = {
      '00000008-AUDIO-2025-07-28-10-17-40.opus': 'Hola, ¿cómo están? Espero que todo esté bien por allá.',
      '00000009-AUDIO-2025-07-28-10-18-33.opus': 'Perfecto, me parece excelente la propuesta que nos enviaste.',
      '00000010-AUDIO-2025-07-28-10-19-10.opus': 'Sí, creo que podemos avanzar con esa idea. ¿Cuándo empezamos?',
      '00000011-AUDIO-2025-07-28-10-20-06.opus': 'Genial, entonces quedamos así. Te confirmo por mensaje.',
      '00000016-AUDIO-2025-07-28-10-25-16.opus': 'Oye, una pregunta sobre el proyecto que estamos desarrollando.',
      '00000017-AUDIO-2025-07-28-10-26-51.opus': 'Claro, dime a ver qué necesitas saber.',
    };

    const audioFileName = fileName || audioFile.name;
    const transcription = mockTranscriptions[audioFileName] || 
      `[Transcripción simulada para ${audioFileName}] Este es un audio de prueba que contiene información importante sobre el proyecto.`;
    
    return NextResponse.json({ 
      transcription,
      fileName: audioFileName,
      mock: true,
      message: 'Esta es una transcripción simulada para pruebas'
    });
  } catch (error) {
    console.error('Test transcription error:', error);
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}
