"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Zap, Brain, FileText } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import ProcessingSteps from '@/components/ProcessingSteps';
import ConversationView from '@/components/ConversationView';
import DebugPanel from '@/components/DebugPanel';
import { parseChatFile, extractMediaFiles } from '@/lib/chat-parser';
import { UploadedFiles, ProcessingState, ChatMessage } from '@/types/chat';

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    chatFile: null,
    mediaFiles: []
  });

  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'upload',
    progress: 0
  });

  const [processedMessages, setProcessedMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateProcessingState = useCallback((updates: Partial<ProcessingState>) => {
    setProcessingState(prev => ({ ...prev, ...updates }));
  }, []);

  const processConversation = async () => {
    if (!uploadedFiles.chatFile) {
      alert('Por favor sube el archivo _chat.txt primero');
      return;
    }

    console.log('=== INICIANDO PROCESAMIENTO ===');
    console.log('Chat file:', uploadedFiles.chatFile.name);
    console.log('Media files:', uploadedFiles.mediaFiles.length);

    setIsProcessing(true);
    
    try {
      // Step 0: Initialize processing
      updateProcessingState({
        step: 'upload',
        progress: 5,
        currentAction: 'Iniciando procesamiento...'
      });

      // Small delay to show the initial step
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 1: Parse chat file
      console.log('Paso 1: Parseando archivo de chat...');
      updateProcessingState({
        step: 'parsing',
        progress: 10,
        currentAction: 'Leyendo archivo de chat...'
      });

      const chatText = await uploadedFiles.chatFile.text();
      console.log('Chat text length:', chatText.length);
      console.log('Chat text preview:', chatText.substring(0, 200));
      
      const chatMessages = parseChatFile(chatText);
      console.log('Parsed messages:', chatMessages.length);
      console.log('First message:', chatMessages[0]);
      
      const mediaFilesNeeded = extractMediaFiles(chatMessages);
      console.log('Media files needed:', mediaFilesNeeded);

      updateProcessingState({
        progress: 25,
        currentAction: `Encontrados ${chatMessages.length} mensajes y ${mediaFilesNeeded.length} archivos multimedia`
      });

      // Step 2: Transcribe audio files
      updateProcessingState({
        step: 'transcribing',
        progress: 30,
        currentAction: 'Iniciando transcripción de audios...'
      });

      const transcriptions: Record<string, string> = {};
      const audioFiles = uploadedFiles.mediaFiles.filter(file => 
        file.type.startsWith('audio/') || 
        file.name.includes('.opus') || 
        file.name.includes('.ogg') ||
        file.name.match(/\d{8}-AUDIO-.*\.opus$/i)
      );

      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        updateProcessingState({
          progress: 30 + (i * 40) / audioFiles.length,
          currentAction: `Transcribiendo audio ${i + 1}/${audioFiles.length}: ${audioFile.name}`
        });

        try {
          console.log(`Iniciando transcripción de: ${audioFile.name}`);
          
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('fileName', audioFile.name);
          formData.append('provider', 'auto'); // Usar modo automático híbrido

          // Add timeout to prevent hanging (más tiempo para Gemini)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

          const response = await fetch('/api/transcribe-hybrid', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log(`Respuesta de transcripción para ${audioFile.name}:`, response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response for ${audioFile.name}:`, errorText);
            throw new Error(`Failed to transcribe ${audioFile.name}: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`Transcripción completada para ${audioFile.name}:`, result.transcription?.substring(0, 100));
          transcriptions[audioFile.name] = result.transcription;
        } catch (error) {
          console.error(`Error transcribing ${audioFile.name}:`, error);
          
          if (error instanceof Error && error.name === 'AbortError') {
            transcriptions[audioFile.name] = `[Timeout transcribiendo ${audioFile.name}]`;
          } else {
            transcriptions[audioFile.name] = `[Error transcribiendo ${audioFile.name}: ${error instanceof Error ? error.message : 'Error desconocido'}]`;
          }
        }
      }

      // Step 3: Organize with AI
      updateProcessingState({
        step: 'organizing',
        progress: 70,
        currentAction: 'Organizando conversación con IA...'
      });

      console.log('Enviando datos a organizar:', {
        messagesCount: chatMessages.length,
        transcriptionsCount: Object.keys(transcriptions).length
      });

      // Add timeout for organization API
      const orgController = new AbortController();
      const orgTimeoutId = setTimeout(() => orgController.abort(), 120000); // 2 minute timeout

      const organizeResponse = await fetch('/api/organize-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatData: chatMessages,
          transcriptions
        }),
        signal: orgController.signal
      });

      clearTimeout(orgTimeoutId);

      console.log('Respuesta de organización:', organizeResponse.status);

      if (!organizeResponse.ok) {
        const errorText = await organizeResponse.text();
        console.error('Error response from organize-chat:', errorText);
        throw new Error(`Failed to organize conversation: ${organizeResponse.status} ${organizeResponse.statusText}`);
      }

      const organizedData = await organizeResponse.json();
      console.log('Datos organizados recibidos:', {
        messagesCount: organizedData.messages?.length || 0,
        summary: organizedData.summary
      });
      
      updateProcessingState({
        step: 'complete',
        progress: 100,
        currentAction: 'Conversación procesada exitosamente'
      });

      setProcessedMessages(organizedData.messages || []);

    } catch (error) {
      console.error('=== ERROR EN PROCESAMIENTO ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      updateProcessingState({
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      console.log('=== FINALIZANDO PROCESAMIENTO ===');
      setIsProcessing(false);
    }
  };

  const testParsingOnly = async () => {
    if (!uploadedFiles.chatFile) {
      alert('Por favor sube el archivo _chat.txt primero');
      return;
    }

    console.log('=== PRUEBA SOLO PARSING ===');
    setIsProcessing(true);
    
    try {
      updateProcessingState({
        step: 'parsing',
        progress: 10,
        currentAction: 'Probando solo el parsing...'
      });

      const chatText = await uploadedFiles.chatFile.text();
      console.log('Chat text length:', chatText.length);
      
      const chatMessages = parseChatFile(chatText);
      console.log('Parsed messages:', chatMessages.length);
      
      const mediaFilesNeeded = extractMediaFiles(chatMessages);
      console.log('Media files needed:', mediaFilesNeeded);

      // Simulate successful completion without APIs
      updateProcessingState({
        step: 'complete',
        progress: 100,
        currentAction: 'Parsing completado exitosamente'
      });

      // Create mock organized data
      const mockOrganizedData = {
        messages: chatMessages.map(msg => ({
          timestamp: msg.timestamp,
          sender: msg.sender,
          content: msg.content,
          type: msg.type,
          originalFile: msg.mediaFile,
          transcription: msg.type === 'audio' ? '[Transcripción simulada]' : undefined
        })),
        summary: `Parsing completado: ${chatMessages.length} mensajes procesados`
      };

      setProcessedMessages(mockOrganizedData.messages);

    } catch (error) {
      console.error('Error en prueba de parsing:', error);
      updateProcessingState({
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testOpusFiles = async () => {
    if (!uploadedFiles.chatFile) {
      alert('Por favor sube el archivo _chat.txt primero');
      return;
    }

    console.log('=== PRUEBA ESPECÍFICA PARA ARCHIVOS OPUS ===');
    setIsProcessing(true);
    
    try {
      // Step 1: Parse chat file
      updateProcessingState({
        step: 'parsing',
        progress: 10,
        currentAction: 'Buscando archivos OPUS...'
      });

      const chatText = await uploadedFiles.chatFile.text();
      const chatMessages = parseChatFile(chatText);
      
      // Filtrar solo archivos OPUS
      const opusFiles = uploadedFiles.mediaFiles.filter(file => 
        file.name.toLowerCase().includes('.opus') ||
        file.name.match(/\d{8}-AUDIO-.*\.opus$/i)
      );

      console.log(`Found ${opusFiles.length} OPUS files:`, opusFiles.map(f => f.name));

      if (opusFiles.length === 0) {
        alert('No se encontraron archivos .opus en los archivos subidos');
        return;
      }

      updateProcessingState({
        progress: 25,
        currentAction: `Encontrados ${opusFiles.length} archivos OPUS para probar`
      });

      // Step 2: Test OPUS files specifically
      updateProcessingState({
        step: 'transcribing',
        progress: 30,
        currentAction: 'Probando transcripción de archivos OPUS...'
      });

      const transcriptions: Record<string, string> = {};

      for (let i = 0; i < opusFiles.length; i++) {
        const audioFile = opusFiles[i];
        updateProcessingState({
          progress: 30 + (i * 60) / opusFiles.length,
          currentAction: `Probando OPUS ${i + 1}/${opusFiles.length}: ${audioFile.name}`
        });

        try {
          console.log(`🔧 Testing OPUS file: ${audioFile.name}`);
          
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('fileName', audioFile.name);

          const response = await fetch('/api/test-opus', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const result = await response.json();
          transcriptions[audioFile.name] = result.transcription;
          
          console.log(`✅ OPUS test result for ${audioFile.name}:`, {
            successful: result.successful,
            provider: result.provider,
            message: result.message,
            transcription: result.transcription.substring(0, 100) + '...'
          });
        } catch (error) {
          console.error(`❌ Error testing ${audioFile.name}:`, error);
          transcriptions[audioFile.name] = `[Error en test OPUS: ${error instanceof Error ? error.message : 'Error desconocido'}]`;
        }
      }

      // Step 3: Complete
      updateProcessingState({
        step: 'complete',
        progress: 100,
        currentAction: `Prueba OPUS completada: ${Object.keys(transcriptions).length} archivos procesados`
      });

      // Create organized data with OPUS test results
      const organizedData = {
        messages: chatMessages.map(msg => ({
          timestamp: msg.timestamp,
          sender: msg.sender,
          content: msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? transcriptions[msg.mediaFile]
            : msg.content,
          type: (msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? 'audio_transcript' 
            : msg.type) as 'text' | 'audio_transcript' | 'audio' | 'image' | 'video' | 'media',
          originalFile: msg.mediaFile,
          transcription: msg.type === 'audio' && msg.mediaFile 
            ? (transcriptions[msg.mediaFile] || '[Audio sin transcribir]')
            : undefined
        })),
        summary: `🔧 Prueba OPUS: ${Object.keys(transcriptions).length} archivos procesados`
      };

      setProcessedMessages(organizedData.messages);

    } catch (error) {
      console.error('Error en prueba OPUS:', error);
      updateProcessingState({
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testWithMockTranscription = async () => {
    if (!uploadedFiles.chatFile) {
      alert('Por favor sube el archivo _chat.txt primero');
      return;
    }

    console.log('=== PRUEBA CON TRANSCRIPCIÓN SIMULADA ===');
    setIsProcessing(true);
    
    try {
      // Step 1: Parse chat file
      updateProcessingState({
        step: 'parsing',
        progress: 10,
        currentAction: 'Parseando archivo de chat...'
      });

      const chatText = await uploadedFiles.chatFile.text();
      const chatMessages = parseChatFile(chatText);
      const mediaFilesNeeded = extractMediaFiles(chatMessages);

      updateProcessingState({
        progress: 25,
        currentAction: `Encontrados ${chatMessages.length} mensajes y ${mediaFilesNeeded.length} archivos multimedia`
      });

      // Step 2: Mock transcribe audio files
      updateProcessingState({
        step: 'transcribing',
        progress: 30,
        currentAction: 'Iniciando transcripción simulada de audios...'
      });

      const transcriptions: Record<string, string> = {};
      const audioFiles = uploadedFiles.mediaFiles.filter(file => 
        file.type.startsWith('audio/') || 
        file.name.includes('.opus') || 
        file.name.includes('.ogg') ||
        file.name.match(/\d{8}-AUDIO-.*\.opus$/i)
      );

      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        updateProcessingState({
          progress: 30 + (i * 40) / audioFiles.length,
          currentAction: `Transcribiendo audio ${i + 1}/${audioFiles.length}: ${audioFile.name}`
        });

        try {
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('fileName', audioFile.name);
          formData.append('provider', 'auto'); // Usar modo automático híbrido

          const response = await Promise.race([
            fetch('/api/transcribe-hybrid', {
              method: 'POST',
              body: formData,
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 90000) // Más tiempo para Gemini
            )
          ]);

          const result = await response.json();
          transcriptions[audioFile.name] = result.transcription;
          console.log(`Mock transcription for ${audioFile.name}:`, result.transcription);
        } catch (error) {
          console.error(`Error transcribing ${audioFile.name}:`, error);
          transcriptions[audioFile.name] = `[Error transcribiendo ${audioFile.name}]`;
        }
      }

      // Step 3: Complete without AI organization
      updateProcessingState({
        step: 'complete',
        progress: 100,
        currentAction: 'Transcripción simulada completada'
      });

      // Create organized data with transcriptions
      const organizedData = {
        messages: chatMessages.map(msg => ({
          timestamp: msg.timestamp,
          sender: msg.sender,
          content: msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? transcriptions[msg.mediaFile]
            : msg.content,
          type: (msg.type === 'audio' && msg.mediaFile && transcriptions[msg.mediaFile] 
            ? 'audio_transcript' 
            : msg.type) as 'text' | 'audio_transcript' | 'audio' | 'image' | 'video' | 'media',
          originalFile: msg.mediaFile,
          transcription: msg.type === 'audio' && msg.mediaFile 
            ? (transcriptions[msg.mediaFile] || '[Audio sin transcribir]')
            : undefined
        })),
        summary: `Conversación procesada con ${Object.keys(transcriptions).length} audios transcritos (simulado)`
      };

      setProcessedMessages(organizedData.messages);

    } catch (error) {
      console.error('Error en prueba con transcripción:', error);
      updateProcessingState({
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canStartProcessing = uploadedFiles.chatFile && !isProcessing;
  const showResults = processingState.step === 'complete' && processedMessages.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              WhatsApp Transcriber AI
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Convierte tus conversaciones de WhatsApp en texto transcrito completo usando 
            OpenAI Whisper + Gemini AI con soporte para TODOS los formatos de audio
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <Zap className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Transcripción Automática</h3>
              <p className="text-sm text-gray-600">
                Transcripción híbrida con OpenAI Whisper + Gemini AI para TODOS los formatos
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <Brain className="w-10 h-10 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Organización IA</h3>
              <p className="text-sm text-gray-600">
                Gemini AI organiza cronológicamente toda la conversación
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <FileText className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Exportación Completa</h3>
              <p className="text-sm text-gray-600">
                Descarga la transcripción completa en formato texto
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {!showResults ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* File Upload Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Paso 1: Cargar Archivos</h2>
              <FileUploader 
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
              />

              <DebugPanel 
                uploadedFiles={uploadedFiles}
                onTestAPI={async () => {}}
                onTestParser={async () => {}}
                onClearLogs={() => {}}
              />
              
              {canStartProcessing && (
                <div className="mt-6 space-y-3">
                  <Button 
                    onClick={processConversation}
                    size="lg"
                    className="w-full"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Iniciar Transcripción y Análisis Completo
                  </Button>
                  
                  <Button 
                    onClick={testWithMockTranscription}
                    size="lg"
                    variant="secondary"
                    className="w-full"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Probar con Transcripción Simulada
                  </Button>
                  
                  <Button 
                    onClick={testOpusFiles}
                    size="lg"
                    variant="destructive"
                    className="w-full"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    🔧 Test OPUS Files (Debug)
                  </Button>
                  
                  <Button 
                    onClick={testParsingOnly}
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Probar Solo Parsing (Sin IA)
                  </Button>
                </div>
              )}

              {uploadedFiles.chatFile && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>Archivos listos:</strong> Chat con {uploadedFiles.mediaFiles.length} archivos multimedia.
                    Haz clic en "Iniciar\" para comenzar el procesamiento.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Processing Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Progreso del Procesamiento</h2>
              <ProcessingSteps state={processingState} />
            </div>
          </div>
        ) : (
          /* Results Section */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Conversación Transcrita</h2>
              <Button 
                variant="outline" 
                onClick={() => {
                  setProcessedMessages([]);
                  setProcessingState({ step: 'upload', progress: 0 });
                  setUploadedFiles({ chatFile: null, mediaFiles: [] });
                }}
              >
                Nuevo Análisis
              </Button>
            </div>
            <ConversationView messages={processedMessages} />
          </div>
        )}
      </div>
    </div>
  );
}