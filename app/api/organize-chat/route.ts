import { NextRequest, NextResponse } from 'next/server';
import { organizeConversation } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  let requestBody: any = null;
  let chatData: any[] = [];
  let transcriptions: Record<string, string> = {};
  let currentStep = 'initialization';
  
  try {
    console.log('🚀 [ORGANIZE-CHAT] Starting conversation organization...');
    
    // Parse and validate request body
    currentStep = 'parsing_request_body';
    try {
      console.log('📥 [ORGANIZE-CHAT] Parsing request body...');
      requestBody = await request.json();
      chatData = requestBody.chatData || [];
      transcriptions = requestBody.transcriptions || {};
      console.log('✅ [ORGANIZE-CHAT] Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ [ORGANIZE-CHAT] Failed to parse request body at step:', currentStep, parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          location: 'organize-chat/route.ts:parsing_request_body',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }, 
        { status: 400 }
      );
    }
    
    // Validate required data
    currentStep = 'validating_chat_data';
    if (!chatData) {
      console.error('❌ [ORGANIZE-CHAT] Missing chatData in request at step:', currentStep);
      return NextResponse.json(
        { 
          error: 'Missing chatData in request',
          location: 'organize-chat/route.ts:validating_chat_data',
          received: Object.keys(requestBody || {})
        }, 
        { status: 400 }
      );
    }
    
    if (!Array.isArray(chatData)) {
      console.error('❌ [ORGANIZE-CHAT] chatData is not an array at step:', currentStep, 'Type:', typeof chatData);
      return NextResponse.json(
        { 
          error: 'chatData must be an array',
          location: 'organize-chat/route.ts:validating_chat_data',
          received_type: typeof chatData,
          received_value: String(chatData).substring(0, 100)
        }, 
        { status: 400 }
      );
    }
    
    if (chatData.length === 0) {
      console.log('ℹ️ [ORGANIZE-CHAT] Empty chatData, returning empty response');
      return NextResponse.json({
        messages: [],
        summary: 'No hay mensajes para organizar',
        fallback: true,
        location: 'organize-chat/route.ts:empty_chat_data'
      }, { status: 200 });
    }
    
    // Ensure transcriptions is an object
    currentStep = 'validating_transcriptions';
    const safeTranscriptions = transcriptions && typeof transcriptions === 'object' ? transcriptions : {};
    
    console.log(`📊 [ORGANIZE-CHAT] Processing ${chatData.length} messages with ${Object.keys(safeTranscriptions).length} transcriptions`);
    
    currentStep = 'checking_gemini_api_key';
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ [ORGANIZE-CHAT] Gemini API key not configured, creating fallback response...');
      
      // Create a simple organized structure without AI
      currentStep = 'fallback_without_ai';
      const organizedMessages = chatData.map((msg: any, index: number) => {
        try {
          const hasTranscription = msg.mediaFile && safeTranscriptions && safeTranscriptions[msg.mediaFile];
        
          if (msg.type === 'audio' && hasTranscription) {
            return {
              timestamp: msg.timestamp || new Date().toISOString(),
              sender: msg.sender || 'Unknown',
              content: safeTranscriptions[msg.mediaFile],
              type: 'audio_transcript',
              originalFile: msg.mediaFile,
              transcription: safeTranscriptions[msg.mediaFile]
            };
          } else if (msg.type === 'audio') {
            return {
              timestamp: msg.timestamp || new Date().toISOString(),
              sender: msg.sender || 'Unknown',
              content: '[Audio sin transcribir]',
              type: 'audio',
              originalFile: msg.mediaFile,
              transcription: '[Audio sin transcribir]'
            };
          } else {
            return {
              timestamp: msg.timestamp || new Date().toISOString(),
              sender: msg.sender || 'Unknown',
              content: msg.content || '',
              type: msg.type || 'text',
              originalFile: msg.mediaFile,
              transcription: undefined
            };
          }
        } catch (msgError) {
          console.error(`❌ [ORGANIZE-CHAT] Error processing message ${index} in fallback_without_ai:`, msgError, msg);
          return {
            timestamp: new Date().toISOString(),
            sender: 'Unknown',
            content: `[Error procesando mensaje ${index}]`,
            type: 'error',
            originalFile: undefined,
            transcription: undefined,
            error_location: 'organize-chat/route.ts:fallback_without_ai:message_processing'
          };
        }
      });

      console.log('✅ [ORGANIZE-CHAT] Fallback without AI completed successfully');
      return NextResponse.json({ 
        messages: organizedMessages,
        summary: `Conversación organizada sin IA - ${Object.keys(safeTranscriptions).length} audios procesados`,
        fallback: true,
        processing_location: 'organize-chat/route.ts:fallback_without_ai'
      }, { status: 200 });
    }

    currentStep = 'organizing_with_gemini';
    console.log('🤖 [ORGANIZE-CHAT] Organizing conversation with Gemini AI...');
    console.log('📊 [ORGANIZE-CHAT] Chat messages:', chatData.length);
    console.log('🎵 [ORGANIZE-CHAT] Transcriptions:', Object.keys(safeTranscriptions).length);

    const organizedConversation = await organizeConversation(chatData, safeTranscriptions);
    console.log('✅ [ORGANIZE-CHAT] Gemini AI processing completed successfully');
    
    return NextResponse.json(organizedConversation);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`💥 [ORGANIZE-CHAT] Critical error at step '${currentStep}':`, {
      message: errorMessage,
      stack: errorStack,
      chatDataLength: chatData?.length || 0,
      transcriptionsCount: Object.keys(transcriptions || {}).length,
      step: currentStep
    });
    
    // Try to provide a fallback response using already parsed data
    try {
      console.log('🔄 [ORGANIZE-CHAT] Attempting emergency fallback...');
      
      if (chatData && Array.isArray(chatData) && chatData.length > 0) {
        const safeTranscriptions = transcriptions && typeof transcriptions === 'object' ? transcriptions : {};
        
        const fallbackMessages = chatData.map((msg: any, index: number) => {
          try {
            return {
              timestamp: msg?.timestamp || new Date().toISOString(),
              sender: msg?.sender || 'Unknown',
              content: msg?.content || '[Contenido no disponible]',
              type: msg?.type || 'text',
              originalFile: msg?.mediaFile,
              transcription: msg?.type === 'audio' ? '[Audio sin transcribir]' : undefined
            };
          } catch (msgError) {
            console.error(`❌ [ORGANIZE-CHAT] Error in emergency fallback for message ${index}:`, msgError);
            return {
              timestamp: new Date().toISOString(),
              sender: 'Unknown',
              content: `[Error procesando mensaje ${index}]`,
              type: 'error',
              originalFile: undefined,
              transcription: undefined,
              error_location: 'organize-chat/route.ts:emergency_fallback:message_processing'
            };
          }
        });
        
        console.log('✅ [ORGANIZE-CHAT] Emergency fallback completed successfully');
        return NextResponse.json({
          messages: fallbackMessages,
          summary: `Conversación organizada con respuesta de emergencia (Error en: ${currentStep})`,
          fallback: true,
          error: {
            message: 'Processed with emergency fallback due to server error',
            location: `organize-chat/route.ts:${currentStep}`,
            original_error: errorMessage,
            timestamp: new Date().toISOString()
          }
        }, { status: 200 });
      }
      
      // If we don't have valid chatData, return minimal response
      console.log('⚠️ [ORGANIZE-CHAT] No valid chatData available, returning minimal response');
      return NextResponse.json({
        messages: [],
        summary: `No se pudieron procesar los mensajes (Error en: ${currentStep})`,
        fallback: true,
        error: {
          message: 'No valid data available for processing',
          location: `organize-chat/route.ts:${currentStep}`,
          original_error: errorMessage,
          timestamp: new Date().toISOString()
        }
      }, { status: 200 });
      
    } catch (fallbackError) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
      console.error('💀 [ORGANIZE-CHAT] Emergency fallback also failed:', fallbackError);
      
      // Absolute last resort - return minimal response
      return NextResponse.json({
        messages: [],
        summary: 'Error crítico en el procesamiento del servidor',
        fallback: true,
        error: {
          message: 'Critical server processing error',
          location: `organize-chat/route.ts:${currentStep}:emergency_fallback`,
          original_error: errorMessage,
          fallback_error: fallbackErrorMessage,
          timestamp: new Date().toISOString(),
          severity: 'critical'
        }
      }, { status: 200 });
    }
  }
}