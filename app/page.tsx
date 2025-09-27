"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Zap, Brain, FileText, Archive, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import ProcessingSteps from '@/components/ProcessingSteps';
import ConversationView from '@/components/ConversationView';
import DebugPanel from '@/components/DebugPanel';
import MultipleConversationsManager from '@/components/MultipleConversationsManager';
import { parseChatFile, extractMediaFiles } from '@/lib/chat-parser';
import { UploadedFiles, ProcessingState, ChatMessage, Conversation, MultipleConversationsState } from '@/types/chat';

export default function Home() {
  // Estado para modo single (original)
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

  // Estado para modo múltiple
  const [multipleMode, setMultipleMode] = useState(false);
  const [multipleConversationsState, setMultipleConversationsState] = useState<MultipleConversationsState>({
    conversations: [],
    activeConversationId: null
  });

  const updateProcessingState = useCallback((updates: Partial<ProcessingState>) => {
    setProcessingState(prev => ({ ...prev, ...updates }));
  }, []);

  // Funciones para múltiples conversaciones
  const handleConversationAdded = useCallback((conversation: Conversation) => {
    setMultipleConversationsState(prev => ({
      ...prev,
      conversations: [...prev.conversations, conversation]
    }));
  }, []);

  const handleUpdateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setMultipleConversationsState(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv => 
        conv.id === conversationId ? { ...conv, ...updates } : conv
      )
    }));
  }, []);

  const handleRemoveConversation = useCallback((conversationId: string) => {
    setMultipleConversationsState(prev => ({
      ...prev,
      conversations: prev.conversations.filter(conv => conv.id !== conversationId),
      activeConversationId: prev.activeConversationId === conversationId ? null : prev.activeConversationId
    }));
  }, []);

  const toggleMode = () => {
    setMultipleMode(!multipleMode);
    // Reset states when switching modes
    if (!multipleMode) {
      // Switching to multiple mode
      setUploadedFiles({ chatFile: null, mediaFiles: [] });
      setProcessedMessages([]);
      setProcessingState({ step: 'upload', progress: 0 });
    } else {
      // Switching to single mode
      setMultipleConversationsState({ conversations: [], activeConversationId: null });
    }
  };

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

          // Add timeout to prevent hanging (más tiempo para Gemini)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

          const response = await fetch('/api/transcribe-gemini', {
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
      console.log('🔍 [DEBUG] Datos organizados recibidos:', {
        messagesCount: organizedData.messages?.length || 0,
        summary: organizedData.summary,
        fallback: organizedData.fallback,
        error: organizedData.error,
        fullResponse: organizedData
      });
      
      // Verificar si hay mensajes válidos
      const messages = organizedData.messages || [];
      console.log('🔍 [DEBUG] Mensajes a procesar:', messages.length);
      
      if (messages.length === 0) {
        console.warn('⚠️ [WARNING] No se recibieron mensajes organizados');
        console.log('📊 [DEBUG] Respuesta completa:', JSON.stringify(organizedData, null, 2));
        
        // Mostrar información del fallback si existe
        if (organizedData.fallback) {
          updateProcessingState({
            step: 'complete',
            progress: 100,
            currentAction: `Procesado con fallback: ${organizedData.summary || 'Sin resumen'}`
          });
        } else {
          updateProcessingState({
            step: 'complete',
            progress: 100,
            currentAction: 'Procesado pero sin mensajes para mostrar'
          });
        }
      } else {
        updateProcessingState({
          step: 'complete',
          progress: 100,
          currentAction: `Conversación procesada exitosamente - ${messages.length} mensajes`
        });
      }

      setProcessedMessages(messages);

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


  const canStartProcessing = !multipleMode && uploadedFiles.chatFile && !isProcessing;
  const showResults = !multipleMode && processingState.step === 'complete';
  const showMultipleManager = multipleMode;

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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Convierte tus conversaciones de WhatsApp en texto transcrito completo usando 
            Gemini AI con soporte universal para todos los formatos de audio
          </p>
          
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <span className={`text-sm font-medium ${!multipleMode ? 'text-blue-600' : 'text-gray-500'}`}>
                  Una Conversación
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMode}
                className="p-1 h-8 w-12"
              >
                {multipleMode ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </Button>
              
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-gray-600" />
                <span className={`text-sm font-medium ${multipleMode ? 'text-blue-600' : 'text-gray-500'}`}>
                  Múltiples Conversaciones
                </span>
              </div>
            </div>
          </div>
          
          {multipleMode && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Users className="w-3 h-3 mr-1" />
              Modo Múltiple Activo
            </Badge>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <Zap className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Transcripción Automática</h3>
              <p className="text-sm text-gray-600">
                Transcripción con Gemini AI para TODOS los formatos de audio
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

        {showMultipleManager ? (
          /* Multiple Conversations Mode */
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Cargar Múltiples Conversaciones</h2>
              <FileUploader 
                multipleMode={true}
                onConversationAdded={handleConversationAdded}
              />
            </div>
            
            <MultipleConversationsManager
              conversations={multipleConversationsState.conversations}
              onUpdateConversation={handleUpdateConversation}
              onRemoveConversation={handleRemoveConversation}
            />
          </div>
        ) : !showResults ? (
          /* Single Conversation Mode - Upload */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* File Upload Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Paso 1: Cargar Archivos</h2>
              <FileUploader 
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
                multipleMode={false}
              />

              <DebugPanel 
                uploadedFiles={uploadedFiles}
                onTestAPI={async () => {}}
                onTestParser={async () => {}}
                onClearLogs={() => {}}
              />
              
              {canStartProcessing && (
                <div className="mt-6">
                  <Button 
                    onClick={processConversation}
                    size="lg"
                    className="w-full"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Iniciar Transcripción con Gemini AI
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
            
            {/* Información de estado del procesamiento */}
            {processingState.currentAction && (
              <Alert className="mb-6">
                <AlertDescription>
                  <strong>Estado:</strong> {processingState.currentAction}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Mostrar mensajes o información de debug */}
            {processedMessages.length > 0 ? (
              <ConversationView messages={processedMessages} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">Procesamiento Completado</h3>
                  <p className="text-gray-600 mb-4">
                    El procesamiento se completó pero no se encontraron mensajes para mostrar.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-yellow-800 mb-2">Información de Debug:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Estado: {processingState.currentAction}</li>
                      <li>• Progreso: {processingState.progress}%</li>
                      <li>• Mensajes procesados: {processedMessages.length}</li>
                    </ul>
                    <p className="text-xs text-yellow-600 mt-3">
                      Revisa la consola del navegador (F12) para más detalles técnicos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}