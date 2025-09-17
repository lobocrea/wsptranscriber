import OpenAI from 'openai';

let openai: OpenAI | null = null;

function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Supported formats by OpenAI Whisper (including opus)
const SUPPORTED_FORMATS = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm', 'opus'];

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isFormatSupported(filename: string): boolean {
  const extension = getFileExtension(filename);
  return SUPPORTED_FORMATS.includes(extension);
}

// Removed convertAudioToMp3 function - OpenAI Whisper supports .opus natively

export async function transcribeAudioWithOpenAI(audioFile: File): Promise<string> {
  try {
    const openaiClient = initializeOpenAI();
    if (!openaiClient) {
      return `[Error: OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file]`;
    }

    console.log(`Processing audio file: ${audioFile.name} (${getFileExtension(audioFile.name)} format, ${audioFile.size} bytes)`);
    
    const extension = getFileExtension(audioFile.name);
    
    // Check if format is supported
    if (!isFormatSupported(audioFile.name)) {
      console.error(`Unsupported format: ${extension}`);
      return `[Formato de audio no soportado: ${extension}. Formatos soportados: ${SUPPORTED_FORMATS.join(', ')}]`;
    }

    console.log(`Sending to OpenAI Whisper: ${audioFile.name} (${extension} format)`);
    
    // Send directly to OpenAI Whisper (supports .opus natively)
    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      response_format: 'text',
    });

    const result = transcription || '[No se pudo transcribir el audio]';
    console.log(`Transcription result for ${audioFile.name}: ${result.substring(0, 100)}...`);
    return result;
  } catch (error) {
    console.error('OpenAI transcription error:', error);
    
    if (error instanceof Error && error.message.includes('Invalid file format')) {
      const extension = getFileExtension(audioFile.name);
      return `[Formato de audio no soportado: ${extension}. Formatos soportados: ${SUPPORTED_FORMATS.join(', ')}]`;
    }
    
    return `[Error transcribiendo ${audioFile.name}: ${error instanceof Error ? error.message : 'Error desconocido'}]`;
  }
}