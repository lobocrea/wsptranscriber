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
  
  const extension = getFileExtension(file.name);
  let mimeType = file.type;
  
  // Asegurar MIME type correcto si no está definido
  if (!mimeType || mimeType === 'application/octet-stream') {
    switch (extension) {
      case 'opus':
        mimeType = 'audio/ogg; codecs=opus';
        break;
      case 'ogg':
        mimeType = 'audio/ogg';
        break;
      case 'mp3':
        mimeType = 'audio/mpeg';
        break;
      case 'wav':
        mimeType = 'audio/wav';
        break;
      case 'm4a':
        mimeType = 'audio/mp4';
        break;
      case 'aac':
        mimeType = 'audio/aac';
        break;
      case 'amr':
        mimeType = 'audio/amr';
        break;
      default:
        mimeType = `audio/${extension}`;
    }
  }
  
  console.log(`🔧 [GEMINI] Preparing file part - MIME: ${mimeType}, Size: ${base64Data.length} chars`);

  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
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

// Función para convertir OPUS a WAV usando Web Audio API
async function convertOpusToWav(opusFile: File): Promise<File> {
  console.log(`🔄 [GEMINI] Converting OPUS to WAV: ${opusFile.name}`);
  
  try {
    // Crear AudioContext
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Leer el archivo OPUS
    const arrayBuffer = await opusFile.arrayBuffer();
    
    // Decodificar el audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convertir a WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    
    // Crear nuevo archivo WAV
    const wavFile = new File([wavBuffer], opusFile.name.replace('.opus', '.wav'), {
      type: 'audio/wav'
    });
    
    console.log(`✅ [GEMINI] OPUS converted to WAV: ${wavFile.size} bytes`);
    return wavFile;
    
  } catch (error) {
    console.error(`❌ [GEMINI] Failed to convert OPUS to WAV:`, error);
    throw new Error(`No se pudo convertir OPUS a WAV: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función auxiliar para convertir AudioBuffer a WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return arrayBuffer;
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
    
    // Convertir OPUS a WAV si es necesario
    if (extension === 'opus') {
      console.log(`🔄 [GEMINI] OPUS file detected, attempting conversion to WAV...`);
      try {
        fileToSend = await convertOpusToWav(audioFile);
        console.log(`✅ [GEMINI] Successfully converted OPUS to WAV`);
      } catch (conversionError) {
        console.error(`❌ [GEMINI] OPUS conversion failed:`, conversionError);
        // Fallback: intentar con OPUS original usando MIME type correcto
        console.log(`🔄 [GEMINI] Fallback: trying original OPUS with proper MIME type`);
        const mimeType = 'audio/ogg; codecs=opus';
        fileToSend = new File([audioFile], audioFile.name, { type: mimeType });
      }
    }
    
    // Asegurar MIME type correcto para otros formatos específicos
    let mimeType = fileToSend.type;
    
    if (extension === 'ogg' && !fileToSend.type.includes('ogg')) {
      mimeType = 'audio/ogg';
      fileToSend = new File([audioFile], audioFile.name, { type: mimeType });
    } else if (extension === 'm4a' && !audioFile.type.includes('m4a')) {
      mimeType = 'audio/mp4';
      fileToSend = new File([audioFile], audioFile.name, { type: mimeType });
    } else if (extension === 'amr' && !audioFile.type.includes('amr')) {
      mimeType = 'audio/amr';
      fileToSend = new File([audioFile], audioFile.name, { type: mimeType });
    }
    
    console.log(`🎵 [GEMINI] Final MIME type: ${fileToSend.type}`);
    console.log(`🎵 [GEMINI] File extension: ${extension}`);
    console.log(`🎵 [GEMINI] Original type: ${audioFile.type}`);
    console.log(`🎵 [GEMINI] File size: ${audioFile.size} bytes`);
    
    // Verificar si el archivo está vacío o corrupto
    if (audioFile.size === 0) {
      throw new Error('El archivo de audio está vacío');
    }
    
    if (audioFile.size < 100) {
      console.warn(`⚠️ [GEMINI] Archivo muy pequeño (${audioFile.size} bytes), puede estar corrupto`);
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
        const ext = getFileExtension(audioFile.name);
        if (ext === 'opus') {
          return `[Error: Formato OPUS no soportado directamente por Gemini. Intenta convertir a MP3 o WAV primero]`;
        }
        return `[Error: Formato no soportado por Gemini: ${ext}. Formatos soportados: MP3, WAV, M4A, AAC]`;
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
