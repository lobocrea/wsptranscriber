import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test OPUS API called - always works for debugging');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const fileName = formData.get('fileName') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const actualFileName = fileName || audioFile.name;
    const fileExtension = actualFileName.split('.').pop()?.toLowerCase() || '';
    
    console.log(`Test processing: ${actualFileName}`);
    console.log(`File size: ${audioFile.size} bytes`);
    console.log(`File type: ${audioFile.type}`);
    console.log(`Extension: ${fileExtension}`);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Always return success for opus files
    if (fileExtension === 'opus') {
      const mockTranscriptions: Record<string, string> = {
        '00000008-AUDIO-2025-07-28-10-17-40.opus': 'Hola Luis, espero que estés bien. Quería comentarte sobre el proyecto que estamos desarrollando.',
        '00000009-AUDIO-2025-07-28-10-18-33.opus': 'Perfecto, me parece una excelente idea. Podemos empezar a trabajar en eso la próxima semana.',
        '00000010-AUDIO-2025-07-28-10-19-10.opus': 'Sí, exactamente. Creo que con esa estrategia vamos a tener muy buenos resultados.',
        '00000011-AUDIO-2025-07-28-10-20-06.opus': 'Genial, entonces quedamos así. Te confirmo todos los detalles por mensaje.',
      };

      const transcription = mockTranscriptions[actualFileName] || 
        `[OPUS TRANSCRITO] Este es el contenido del archivo ${actualFileName}. La transcripción funcionó correctamente usando el sistema de prueba.`;
      
      return NextResponse.json({ 
        transcription,
        fileName: actualFileName,
        provider: 'test-opus',
        fileSize: audioFile.size,
        successful: true,
        message: '✅ OPUS file processed successfully with test API'
      });
    } else {
      return NextResponse.json({ 
        transcription: `[FORMATO NO OPUS] Este archivo es ${fileExtension}, no opus. El test API solo maneja opus.`,
        fileName: actualFileName,
        provider: 'test-opus',
        fileSize: audioFile.size,
        successful: false,
        message: `❌ Test API only handles .opus files, got .${fileExtension}`
      });
    }
  } catch (error) {
    console.error('Test OPUS API error:', error);
    return NextResponse.json(
      { 
        error: `Test API failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transcription: `[ERROR EN TEST API: ${error instanceof Error ? error.message : 'Error desconocido'}]`,
        provider: 'test-opus',
        successful: false
      }, 
      { status: 500 }
    );
  }
}
