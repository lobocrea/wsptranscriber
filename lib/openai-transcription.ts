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
  const isSupported = SUPPORTED_FORMATS.includes(extension);
  console.log(`Checking format support for: ${filename}`);
  console.log(`Extension: ${extension}`);
  console.log(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
  console.log(`Is supported: ${isSupported}`);
  
  // Special handling for opus files - they should always be supported
  if (extension === 'opus' || filename.includes('.opus')) {
    console.log('Opus file detected - forcing support to true');
    return true;
  }
  
  return isSupported;
}

// Removed convertAudioToMp3 function - OpenAI Whisper supports .opus natively

export async function transcribeAudioWithOpenAI(audioFile: File): Promise<string> {
  try {
    const openaiClient = initializeOpenAI();
    if (!openaiClient) {
      return `[Error: OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file]`;
    }

    console.log(`Processing audio file: ${audioFile.name} (${getFileExtension(audioFile.name)} format, ${audioFile.size} bytes)`);
    console.log(`File type: ${audioFile.type}`);
    
    const extension = getFileExtension(audioFile.name);
    
    // Check if format is supported
    if (!isFormatSupported(audioFile.name)) {
      console.error(`Unsupported format: ${extension}`);
      return `[Formato de audio no soportado: ${extension}. Formatos soportados: ${SUPPORTED_FORMATS.join(', ')}]`;
    }

    // For opus files, ensure the correct MIME type and handle special cases
    let fileToSend = audioFile;
    if (extension === 'opus') {
      console.log(`🎵 [OPENAI] Processing OPUS file: ${audioFile.name}`);
      console.log(`🎵 [OPENAI] Original MIME type: ${audioFile.type}`);
      console.log(`🎵 [OPENAI] File size: ${audioFile.size} bytes`);
      
      // Verify file is not empty or corrupted
      if (audioFile.size === 0) {
        throw new Error('El archivo OPUS está vacío');
      }
      
      if (audioFile.size < 100) {
        console.warn(`⚠️ [OPENAI] Archivo OPUS muy pequeño (${audioFile.size} bytes), puede estar corrupto`);
      }
      
      // WhatsApp OPUS files sometimes need to be treated as OGG containers
      // Try renaming to .ogg with proper MIME type
      const oggFileName = audioFile.name.replace('.opus', '.ogg');
      const oggMimeType = 'audio/ogg';
      
      console.log(`🔧 [OPENAI] Converting OPUS to OGG format for better compatibility`);
      console.log(`🔧 [OPENAI] New filename: ${oggFileName}`);
      console.log(`🔧 [OPENAI] New MIME type: ${oggMimeType}`);
      
      fileToSend = new File([audioFile], oggFileName, { type: oggMimeType });
      console.log(`🎵 [OPENAI] Final file: ${fileToSend.name} (${fileToSend.type})`);
    }

    console.log(`Sending to OpenAI Whisper: ${fileToSend.name} (${extension} format)`);
    
    // Send directly to OpenAI Whisper (supports .opus natively)
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fileToSend,
      model: 'whisper-1',
      language: 'es',
      response_format: 'text',
    });

    const result = transcription || '[No se pudo transcribir el audio]';
    console.log(`Transcription result for ${audioFile.name}: ${result.substring(0, 100)}...`);
    return result;
  } catch (error) {
    console.error('❌ [OPENAI] OpenAI transcription error:', error);
    console.error('❌ [OPENAI] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    });
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid file format') || error.message.includes('unsupported')) {
        const extension = getFileExtension(audioFile.name);
        console.error(`❌ [OPENAI] Format error for ${extension} file`);
        
        if (extension === 'opus') {
          return `[Error OpenAI: Archivo OPUS no pudo ser procesado. Posible corrupción o formato no estándar]`;
        }
        
        return `[Formato de audio no soportado por OpenAI: ${extension}. Formatos soportados: ${SUPPORTED_FORMATS.join(', ')}]`;
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        return `[Error: OpenAI API key no válida o no configurada. Verifica tu .env.local]`;
      } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('429')) {
        return `[Error: Límite de cuota de OpenAI alcanzado. Intenta más tarde]`;
      } else if (error.message.includes('file size') || error.message.includes('too large') || error.message.includes('413')) {
        return `[Error: Archivo demasiado grande para OpenAI (máx. 25MB). Archivo: ${Math.round(audioFile.size / 1024 / 1024)}MB]`;
      }
    }
    
    return `[Error transcribiendo ${audioFile.name} con OpenAI: ${error instanceof Error ? error.message : 'Error desconocido'}]`;
  }
}