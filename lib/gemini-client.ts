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
  let lastError: Error = new Error('Unknown retry error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.log(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Check if it's a 503 overload error or rate limit
      const isRetryableError = (
        lastError.message?.includes('503') || 
        lastError.message?.includes('overloaded') ||
        lastError.message?.includes('rate limit') ||
        lastError.message?.includes('quota')
      );
      
      if (!isRetryableError || attempt === maxRetries) {
        console.log(`Not retrying. Retryable: ${isRetryableError}, Attempt: ${attempt}/${maxRetries}`);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
      console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (delayError) {
        console.error('Error in delay:', delayError);
        // Continue anyway
      }
    }
  }
  
  throw lastError;
}

export async function organizeConversation(chatData: any[], transcriptions: Record<string, string>) {
  let currentStep = 'initialization';
  
  try {
    console.log('🚀 [GEMINI-CLIENT] Starting conversation organization...');
    
    currentStep = 'validating_api_key';
    if (!process.env.GEMINI_API_KEY) {
      const error = new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file');
      console.error('❌ [GEMINI-CLIENT] API key validation failed at step:', currentStep);
      throw error;
    }

    // Validate input data
    currentStep = 'validating_input_data';
    if (!Array.isArray(chatData)) {
      const error = new Error('chatData must be an array');
      console.error('❌ [GEMINI-CLIENT] Input validation failed at step:', currentStep, 'Type:', typeof chatData);
      throw error;
    }

    if (chatData.length === 0) {
      console.log('ℹ️ [GEMINI-CLIENT] Empty chatData, returning empty response');
      return {
        messages: [],
        summary: 'No hay mensajes para organizar',
        processing_location: 'gemini-client.ts:empty_data'
      };
    }

    // Ensure transcriptions is a valid object
    currentStep = 'validating_transcriptions';
    const safeTranscriptions = transcriptions && typeof transcriptions === 'object' ? transcriptions : {};
    
    console.log(`📊 [GEMINI-CLIENT] Organizing ${chatData.length} messages with ${Object.keys(safeTranscriptions).length} transcriptions`);

    currentStep = 'initializing_gemini_model';
    let geminiModel;
    try {
      console.log('🤖 [GEMINI-CLIENT] Initializing Gemini model...');
      geminiModel = getGeminiModel();
      console.log('✅ [GEMINI-CLIENT] Gemini model initialized successfully');
    } catch (modelError) {
      console.error('❌ [GEMINI-CLIENT] Error getting Gemini model at step:', currentStep, modelError);
      // Return fallback immediately if we can't get the model
      console.log('🔄 [GEMINI-CLIENT] Using model initialization fallback...');
      return {
        messages: chatData.map((msg, index) => {
          try {
            return {
              timestamp: msg?.timestamp || new Date().toISOString(),
              sender: msg?.sender || 'Unknown',
              content: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? safeTranscriptions[msg.mediaFile]
                : msg?.content || '[Contenido no disponible]',
              type: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? 'audio_transcript' 
                : msg?.type || 'text',
              originalFile: msg?.mediaFile,
              transcription: msg?.type === 'audio' || msg?.type === 'audio_transcript' 
                ? (msg?.mediaFile && safeTranscriptions[msg.mediaFile] ? safeTranscriptions[msg.mediaFile] : '[Audio sin transcribir]')
                : undefined
            };
          } catch (msgError) {
            console.error(`❌ [GEMINI-CLIENT] Error processing message ${index} in model fallback:`, msgError);
            return {
              timestamp: new Date().toISOString(),
              sender: 'Unknown',
              content: `[Error procesando mensaje ${index}]`,
              type: 'error',
              originalFile: undefined,
              transcription: undefined,
              error_location: 'gemini-client.ts:model_initialization_fallback:message_processing'
            };
          }
        }),
        summary: `Error inicializando Gemini - Conversación organizada con fallback (${Object.keys(safeTranscriptions).length} transcripciones)`,
        fallback: true,
        error: {
          message: 'Model initialization failed',
          location: 'gemini-client.ts:initializing_gemini_model',
          original_error: modelError instanceof Error ? modelError.message : 'Unknown model error',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Pre-process messages to integrate transcriptions
    currentStep = 'preprocessing_messages';
    console.log('🔄 [GEMINI-CLIENT] Pre-processing messages...');
    const processedMessages = chatData.map((msg, index) => {
      try {
        // Ensure message has required fields
        const safeMsg = {
          timestamp: msg.timestamp || new Date().toISOString(),
          sender: msg.sender || 'Unknown',
          content: msg.content || '',
          type: msg.type || 'text',
          mediaFile: msg.mediaFile
        };
      
        // Check for audio transcriptions by filename or by any available transcription
        const hasTranscription = safeMsg.mediaFile && safeTranscriptions[safeMsg.mediaFile];
        const isAudioType = safeMsg.type === 'audio';
        
        if (isAudioType && hasTranscription) {
          return {
            ...safeMsg,
            content: safeTranscriptions[safeMsg.mediaFile],
            type: 'audio_transcript',
            originalContent: safeMsg.content,
            transcription: safeTranscriptions[safeMsg.mediaFile]
          };
        } else if (isAudioType) {
          // Mark as audio even without transcription
          return {
            ...safeMsg,
            type: 'audio',
            transcription: '[Audio sin transcribir]'
          };
        }
        return safeMsg;
      } catch (msgError) {
        console.error(`❌ [GEMINI-CLIENT] Error processing message ${index} in preprocessing:`, msgError);
        return {
          timestamp: new Date().toISOString(),
          sender: 'Unknown',
          content: `[Error procesando mensaje ${index}]`,
          type: 'error',
          mediaFile: undefined,
          error_location: 'gemini-client.ts:preprocessing_messages:message_processing'
        };
      }
    });
    
    console.log('✅ [GEMINI-CLIENT] Messages pre-processed successfully');

    const prompt = `
Eres un experto organizador de conversaciones de WhatsApp. Tu tarea es organizar esta conversación manteniendo el orden cronológico EXACTO y integrando correctamente las transcripciones de audio.

DATOS DE ENTRADA:
- Mensajes procesados: ${JSON.stringify(processedMessages.slice(0, 20), null, 2)}
${processedMessages.length > 20 ? `... y ${processedMessages.length - 20} mensajes más` : ''}

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
  "summary": "Conversación organizada cronológicamente con ${Object.keys(safeTranscriptions).length} audios transcritos"
}

IMPORTANTE: 
- Responde SOLO con JSON válido
- NO modifiques timestamps ni nombres de remitentes
- NO reordenes mensajes, mantén el orden cronológico original
- Integra las transcripciones donde corresponde
`;

    currentStep = 'generating_content_with_gemini';
    console.log('🤖 [GEMINI-CLIENT] Generating content with Gemini AI...');
    
    let result: any;
    try {
      result = await retryWithBackoff(
        () => geminiModel.generateContent(prompt),
        3, // max 3 retries
        2000 // start with 2 second delay
      );
      console.log('✅ [GEMINI-CLIENT] Gemini AI content generated successfully');
    } catch (generateError) {
      console.error('❌ [GEMINI-CLIENT] Error generating content at step:', currentStep, generateError);
      throw generateError;
    }
    
    currentStep = 'extracting_response_text';
    const response = result.response.text();
    console.log('📝 [GEMINI-CLIENT] Response text extracted, length:', response.length);
    
    // Extract JSON from the response more robustly
    currentStep = 'parsing_gemini_response';
    console.log('🔍 [GEMINI-CLIENT] Parsing Gemini response...');
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
    
    currentStep = 'parsing_extracted_json';
    try {
      const parsedResult = JSON.parse(jsonString);
      console.log('✅ [GEMINI-CLIENT] JSON parsed successfully');
      return parsedResult;
    } catch (parseError) {
      console.error('❌ [GEMINI-CLIENT] JSON parse error at step:', currentStep, parseError);
      console.log('📄 [GEMINI-CLIENT] Raw Gemini response:', response.substring(0, 500) + '...');
      console.log('🔤 [GEMINI-CLIENT] Extracted JSON string:', jsonString.substring(0, 500) + '...');
      
      // Fallback: create a basic organized structure
      console.log('🔄 [GEMINI-CLIENT] Using JSON parse fallback...');
      return {
        messages: chatData.map((msg, index) => {
          try {
            return {
              timestamp: msg?.timestamp || new Date().toISOString(),
              sender: msg?.sender || 'Unknown',
              content: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? safeTranscriptions[msg.mediaFile]
                : msg?.type === 'audio_transcript'
                ? msg?.content
                : msg?.content || '',
              type: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? 'audio_transcript' 
                : msg?.type === 'audio_transcript'
                ? 'audio_transcript'
                : msg?.type === 'image'
                ? 'image'
                : msg?.type === 'video'
                ? 'video'
                : msg?.type || 'text',
              originalFile: msg?.mediaFile,
              transcription: msg?.type === 'audio' || msg?.type === 'audio_transcript' 
                ? (msg?.mediaFile && safeTranscriptions[msg.mediaFile] ? safeTranscriptions[msg.mediaFile] : msg?.transcription || '[Audio sin transcribir]')
                : undefined
            };
          } catch (msgError) {
            console.error(`❌ [GEMINI-CLIENT] Error in fallback processing message ${index}:`, msgError);
            return {
              timestamp: new Date().toISOString(),
              sender: 'Unknown',
              content: `[Error procesando mensaje ${index}]`,
              type: 'error',
              originalFile: undefined,
              transcription: undefined,
              error_location: 'gemini-client.ts:json_parse_fallback:message_processing'
            };
          }
        }),
        summary: "Conversación organizada con transcripciones integradas (JSON parse fallback)",
        fallback: true,
        error: {
          message: 'JSON parsing failed, used fallback processing',
          location: 'gemini-client.ts:parsing_extracted_json',
          original_error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          timestamp: new Date().toISOString()
        }
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`💥 [GEMINI-CLIENT] Critical error at step '${currentStep}':`, {
      message: errorMessage,
      stack: errorStack,
      chatDataLength: chatData?.length || 0,
      transcriptionsCount: Object.keys(transcriptions || {}).length,
      step: currentStep
    });
    
    // Instead of throwing, return a fallback response
    try {
      console.log('🔄 [GEMINI-CLIENT] Attempting Gemini error fallback...');
      const safeTranscriptions = transcriptions && typeof transcriptions === 'object' ? transcriptions : {};
      
      return {
        messages: chatData.map((msg, index) => {
          try {
            return {
              timestamp: msg?.timestamp || new Date().toISOString(),
              sender: msg?.sender || 'Unknown',
              content: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? safeTranscriptions[msg.mediaFile]
                : msg?.content || '[Contenido no disponible]',
              type: msg?.type === 'audio' && msg?.mediaFile && safeTranscriptions[msg.mediaFile] 
                ? 'audio_transcript' 
                : msg?.type || 'text',
              originalFile: msg?.mediaFile,
              transcription: msg?.type === 'audio' || msg?.type === 'audio_transcript' 
                ? (msg?.mediaFile && safeTranscriptions[msg.mediaFile] ? safeTranscriptions[msg.mediaFile] : '[Audio sin transcribir]')
                : undefined
            };
          } catch (msgError) {
            console.error(`❌ [GEMINI-CLIENT] Error in Gemini fallback processing message ${index}:`, msgError);
            return {
              timestamp: new Date().toISOString(),
              sender: 'Unknown',
              content: `[Error procesando mensaje ${index}]`,
              type: 'error',
              originalFile: undefined,
              transcription: undefined,
              error_location: 'gemini-client.ts:gemini_error_fallback:message_processing'
            };
          }
        }),
        summary: `Error en Gemini AI (${currentStep}) - Conversación organizada con fallback (${Object.keys(safeTranscriptions).length} transcripciones)`,
        fallback: true,
        error: {
          message: 'Gemini AI processing failed',
          location: `gemini-client.ts:${currentStep}`,
          original_error: errorMessage,
          timestamp: new Date().toISOString()
        }
      };
    } catch (fallbackError) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
      console.error('💀 [GEMINI-CLIENT] Critical error in Gemini fallback:', fallbackError);
      
      // Absolute last resort
      return {
        messages: [],
        summary: 'Error crítico en el procesamiento con Gemini AI',
        fallback: true,
        error: {
          message: 'Critical Gemini processing error',
          location: `gemini-client.ts:${currentStep}:gemini_error_fallback`,
          original_error: errorMessage,
          fallback_error: fallbackErrorMessage,
          timestamp: new Date().toISOString(),
          severity: 'critical'
        }
      };
    }
  }
}
