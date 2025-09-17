import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioWithOpenAI } from '@/lib/openai-transcription';
import { transcribeAudioWithGemini } from '@/lib/gemini-transcription';

export async function POST(request: NextRequest) {
  try {
    console.log('Hybrid transcription API called');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const fileName = formData.get('fileName') as string;
    const preferredProvider = formData.get('provider') as string || 'auto';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const actualFileName = fileName || audioFile.name;
    console.log(`Processing audio file: ${actualFileName}`);
    console.log(`File size: ${audioFile.size} bytes`);
    console.log(`File type: ${audioFile.type}`);
    console.log(`Preferred provider: ${preferredProvider}`);

    let transcription = '';
    let usedProvider = '';
    let error = '';

    // Determinar qué proveedor usar
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const fileExtension = actualFileName.split('.').pop()?.toLowerCase() || '';
    
    console.log(`Available providers - OpenAI: ${hasOpenAI}, Gemini: ${hasGemini}`);
    console.log(`File extension: ${fileExtension}`);

    // Estrategia de transcripción
    if (preferredProvider === 'openai' && hasOpenAI) {
      // Usar OpenAI específicamente
      console.log('Using OpenAI as requested');
      transcription = await transcribeAudioWithOpenAI(audioFile);
      usedProvider = 'openai';
    } else if (preferredProvider === 'gemini' && hasGemini) {
      // Usar Gemini específicamente
      console.log('Using Gemini as requested');
      transcription = await transcribeAudioWithGemini(audioFile);
      usedProvider = 'gemini';
    } else {
      // Modo automático - probar ambos con fallback
      console.log('Auto mode - trying available providers');
      
      // Para archivos .opus, priorizar Gemini (mejor soporte)
      const shouldPreferGemini = fileExtension === 'opus' || 
                                fileExtension === 'amr' || 
                                fileExtension === '3gp' ||
                                !hasOpenAI;
      
      if (shouldPreferGemini && hasGemini) {
        console.log(`Preferring Gemini for ${fileExtension} format...`);
      } else if (hasGemini) {
        try {
          console.log('Trying Gemini first...');
          transcription = await transcribeAudioWithGemini(audioFile);
          usedProvider = 'gemini';
          
          // Si la transcripción contiene errores, intentar con OpenAI
          if (transcription.includes('[Error') && hasOpenAI) {
            console.log('Gemini failed, trying OpenAI as fallback...');
            const openaiResult = await transcribeAudioWithOpenAI(audioFile);
            if (!openaiResult.includes('[Error')) {
              transcription = openaiResult;
              usedProvider = 'openai (fallback)';
            }
          }
        } catch (geminiError) {
          console.log('Gemini failed, trying OpenAI...', geminiError);
          if (hasOpenAI) {
            try {
              transcription = await transcribeAudioWithOpenAI(audioFile);
              usedProvider = 'openai (fallback)';
            } catch (openaiError) {
              error = `Both providers failed - Gemini: ${geminiError}, OpenAI: ${openaiError}`;
              transcription = `[Error: Ambos proveedores fallaron]`;
              usedProvider = 'none';
            }
          } else {
            error = `Gemini failed and OpenAI not available: ${geminiError}`;
            transcription = `[Error: Solo Gemini disponible y falló]`;
            usedProvider = 'none';
          }
        }
      } else if (hasOpenAI) {
        console.log('Only OpenAI available, using it...');
        transcription = await transcribeAudioWithOpenAI(audioFile);
        usedProvider = 'openai';
      } else {
        error = 'No API keys configured';
        transcription = '[Error: No hay API keys configuradas. Configura OPENAI_API_KEY o GEMINI_API_KEY]';
        usedProvider = 'none';
      }
    }

    // Verificar calidad de la transcripción
    const isSuccessful = !transcription.includes('[Error') && 
                        transcription.length > 3 && 
                        !transcription.includes('no se pudo');

    return NextResponse.json({ 
      transcription,
      fileName: actualFileName,
      provider: usedProvider,
      fileSize: audioFile.size,
      successful: isSuccessful,
      error: error || undefined,
      availableProviders: {
        openai: hasOpenAI,
        gemini: hasGemini
      }
    });
  } catch (error) {
    console.error('Hybrid transcription error:', error);
    return NextResponse.json(
      { 
        error: `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transcription: `[Error en transcripción híbrida: ${error instanceof Error ? error.message : 'Error desconocido'}]`,
        provider: 'none',
        successful: false
      }, 
      { status: 500 }
    );
  }
}
