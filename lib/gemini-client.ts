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
      
      // Check if it's a 503 overload error
      const isOverloadError = error.message?.includes('503') && 
                             error.message?.includes('overloaded');
      
      if (!isOverloadError || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Gemini API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function organizeConversation(chatData: any[], transcriptions: Record<string, string>) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file');
  }

  const geminiModel = getGeminiModel();

  // Pre-process messages to integrate transcriptions
  const processedMessages = chatData.map(msg => {
    // Check for audio transcriptions by filename or by any available transcription
    const hasTranscription = msg.mediaFile && transcriptions[msg.mediaFile];
    const isAudioType = msg.type === 'audio';
    
    if (isAudioType && hasTranscription) {
      return {
        ...msg,
        content: transcriptions[msg.mediaFile],
        type: 'audio_transcript',
        originalContent: msg.content,
        transcription: transcriptions[msg.mediaFile]
      };
    } else if (isAudioType) {
      // Mark as audio even without transcription
      return {
        ...msg,
        type: 'audio',
        transcription: '[Audio sin transcribir]'
      };
    }
    return msg;
  });

  const prompt = `
Eres un experto organizador de conversaciones de WhatsApp. Tu tarea es organizar esta conversación manteniendo el orden cronológico EXACTO y integrando correctamente las transcripciones de audio.

DATOS DE ENTRADA:
- Mensajes procesados: ${JSON.stringify(processedMessages.slice(0, 50), null, 2)}
${processedMessages.length > 50 ? `... y ${processedMessages.length - 50} mensajes más` : ''}

INSTRUCCIONES CRÍTICAS:
1. MANTÉN EL ORDEN CRONOLÓGICO EXACTO - No reordenes los mensajes
2. Para mensajes tipo "audio_transcript": usa el contenido transcrito como content principal
3. Para mensajes tipo "audio": marca como audio sin transcripción
4. Para mensajes tipo "image": mantén el contenido original y marca como imagen
5. Para mensajes tipo "video": mantén el contenido original y marca como video
6. Para mensajes tipo "text": mantén tal como están
7. PRESERVA todos los timestamps originales sin modificar
8. PRESERVA todos los nombres de remitentes sin modificar
9. SIEMPRE incluye el campo "originalFile" si existe
10. SIEMPRE incluye el campo "transcription" para audios

FORMATO DE RESPUESTA (JSON válido):
{
  "messages": [
    {
      "timestamp": "fecha y hora exacta del mensaje original",
      "sender": "nombre del remitente",
      "content": "contenido del mensaje (transcripción si es audio)",
      "type": "text|audio_transcript|image|video",
      "originalFile": "nombre del archivo si aplica",
      "transcription": "texto transcrito para audios"
    }
  ],
  "summary": "Conversación organizada cronológicamente con ${Object.keys(transcriptions).length} audios transcritos"
}

IMPORTANTE: 
- Responde SOLO con JSON válido
- NO modifiques timestamps ni nombres de remitentes
- NO reordenes mensajes, mantén el orden cronológico original
- Integra las transcripciones donde corresponde
`;

  try {
    const result = await retryWithBackoff(
      () => geminiModel.generateContent(prompt),
      3, // max 3 retries
      2000 // start with 2 second delay
    );
    const response = result.response.text();
    
    // Extract JSON from the response more robustly
    let jsonString = '';
    
    // First, try to find JSON within markdown code blocks
    const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    } else {
      // If no markdown block, try to find the outermost JSON object or array
      const jsonObjectMatch = response.match(/\{[\s\S]*?\}/);
      const jsonArrayMatch = response.match(/\[[\s\S]*?\]/);
      
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
      } else if (jsonArrayMatch) {
        jsonString = jsonArrayMatch[0];
      } else {
        // Fallback: clean the entire response
        jsonString = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw Gemini response:', response);
      console.log('Extracted JSON string:', jsonString);
      
      // Fallback: create a basic organized structure
      return {
        messages: chatData.map(msg => ({
          timestamp: msg.timestamp,
          sender: msg.sender,
          content: msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? transcriptions[msg.mediaFile]
            : msg.type === 'audio_transcript'
            ? msg.content
            : msg.content,
          type: msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? 'audio_transcript' 
            : msg.type === 'audio_transcript'
            ? 'audio_transcript'
            : msg.type === 'image'
            ? 'image'
            : msg.type === 'video'
            ? 'video'
            : msg.type,
          originalFile: msg.mediaFile,
          transcription: msg.type === 'audio' || msg.type === 'audio_transcript' 
            ? (msg.mediaFile && transcriptions[msg.mediaFile] ? transcriptions[msg.mediaFile] : msg.transcription || '[Audio sin transcribir]')
            : undefined
        })),
        summary: "Conversación organizada con transcripciones integradas"
      };
    }
  } catch (error) {
    console.error('Error with Gemini AI:', error);
    throw new Error(`Error organizando conversación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}