import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function initializeGemini() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export function getGeminiModel() {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

// Todos los formatos de audio soportados por Gemini AI
const GEMINI_SUPPORTED_FORMATS = [
  // Formatos principales
  'mp3', 'wav', 'aiff', 'aac', 'ogg', 'flac',
  // Formatos de video con audio
  'mp4', 'mov', 'avi', 'mpg', 'mpeg', 'mpv', 'mkv', 'webm',
  // Formatos específicos
  'm4a', 'wma', 'opus', '3gp', 'amr', 'awb',
  // Formatos menos comunes pero soportados
  'ac3', 'dts', 'ra', 'rm', 'au', 'snd',
  // Formatos de WhatsApp y mensajería
  'caf', 'aac', 'amr-nb', 'amr-wb'
];

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isGeminiFormatSupported(filename: string): boolean {
  const extension = getFileExtension(filename);
  const isSupported = GEMINI_SUPPORTED_FORMATS.includes(extension);
  console.log(`Gemini format check for: ${filename}`);
  console.log(`Extension: ${extension}`);
  console.log(`Gemini supported: ${isSupported}`);
  return isSupported;
}

async function fileToGenerativePart(file: File) {
  // Convert File to ArrayBuffer, then to Buffer, then to base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');

  return {
    inlineData: {
      data: base64Data,
      mimeType: file.type || `audio/${getFileExtension(file.name)}`
    },
  };
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a 503 overload error or rate limit
      const isRetryableError = error.message?.includes('503') || 
                              error.message?.includes('overloaded') ||
                              error.message?.includes('rate limit') ||
                              error.message?.includes('quota');
      
      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Gemini API error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function transcribeAudioWithGemini(audioFile: File): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return `[Error: Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file]`;
    }

    console.log(`Processing audio with Gemini: ${audioFile.name} (${getFileExtension(audioFile.name)} format, ${audioFile.size} bytes)`);
    console.log(`File type: ${audioFile.type}`);
    
    const extension = getFileExtension(audioFile.name);
    
    // Gemini soporta prácticamente todos los formatos, pero validemos los más comunes
    if (!isGeminiFormatSupported(audioFile.name)) {
      console.log(`Format ${extension} not in common list, but trying anyway...`);
    }

    // Preparar el archivo para Gemini
    let fileToSend = audioFile;
    
    // Asegurar MIME type correcto para formatos específicos
    if (extension === 'opus' && !audioFile.type.includes('opus')) {
      fileToSend = new File([audioFile], audioFile.name, { type: 'audio/opus' });
    } else if (extension === 'ogg' && !audioFile.type.includes('ogg')) {
      fileToSend = new File([audioFile], audioFile.name, { type: 'audio/ogg' });
    } else if (extension === 'm4a' && !audioFile.type.includes('m4a')) {
      fileToSend = new File([audioFile], audioFile.name, { type: 'audio/m4a' });
    } else if (extension === 'amr' && !audioFile.type.includes('amr')) {
      fileToSend = new File([audioFile], audioFile.name, { type: 'audio/amr' });
    }

    console.log(`Sending to Gemini AI: ${fileToSend.name} (${extension} format)`);
    
    const geminiModel = getGeminiModel();
    const audioPart = await fileToGenerativePart(fileToSend);

    const prompt = `
Por favor, transcribe este archivo de audio al español. 

INSTRUCCIONES:
1. Transcribe exactamente lo que se dice en el audio
2. Usa puntuación apropiada
3. Si hay múltiples personas hablando, no las identifiques, solo transcribe el contenido
4. Si hay ruido de fondo o partes inaudibles, indica [inaudible]
5. Mantén el tono natural del habla
6. No agregues comentarios o interpretaciones, solo la transcripción

Responde ÚNICAMENTE con la transcripción del audio, sin explicaciones adicionales.
`;

    const result = await retryWithBackoff(
      () => geminiModel.generateContent([prompt, audioPart]),
      3, // max 3 retries
      2000 // start with 2 second delay
    );

    const transcription = result.response.text().trim();
    
    if (!transcription || transcription.length < 3) {
      return `[No se pudo transcribir el audio con Gemini]`;
    }

    console.log(`Gemini transcription result for ${audioFile.name}: ${transcription.substring(0, 100)}...`);
    return transcription;

  } catch (error) {
    console.error('Gemini transcription error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    });
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
        return `[Error: Gemini API key no válida o no configurada. Verifica tu .env.local]`;
      } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('429')) {
        return `[Error: Límite de cuota de Gemini alcanzado. Intenta más tarde]`;
      } else if (error.message.includes('file size') || error.message.includes('too large') || error.message.includes('413')) {
        return `[Error: Archivo demasiado grande para Gemini (máx. ~20MB). Archivo: ${Math.round(audioFile.size / 1024 / 1024)}MB]`;
      } else if (error.message.includes('format') || error.message.includes('unsupported') || error.message.includes('400')) {
        return `[Error: Formato no soportado por Gemini: ${getFileExtension(audioFile.name)}]`;
      } else if (error.message.includes('FileReader')) {
        return `[Error interno: Problema de conversión de archivo. Intenta de nuevo]`;
      }
    }
    
    return `[Error transcribiendo ${audioFile.name} con Gemini: ${error instanceof Error ? error.message : 'Error desconocido'}]`;
  }
}

// Función para obtener información de formatos soportados
export function getGeminiSupportedFormats(): string[] {
  return [...GEMINI_SUPPORTED_FORMATS];
}

// Función para verificar si un archivo es soportado
export function isAudioSupportedByGemini(filename: string): boolean {
  return isGeminiFormatSupported(filename);
}
