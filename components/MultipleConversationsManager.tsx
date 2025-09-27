"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Play, 
  Pause, 
  Trash2, 
  Eye, 
  Archive,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  PlayCircle,
  Zap
} from 'lucide-react';
import { Conversation, ChatMessage } from '@/types/chat';
import { parseChatFile, extractMediaFiles } from '@/lib/chat-parser';
import ProcessingSteps from './ProcessingSteps';
import ConversationView from './ConversationView';

interface MultipleConversationsManagerProps {
  conversations: Conversation[];
  onUpdateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  onRemoveConversation: (conversationId: string) => void;
}

export default function MultipleConversationsManager({
  conversations,
  onUpdateConversation,
  onRemoveConversation
}: MultipleConversationsManagerProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [viewingConversationId, setViewingConversationId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const processConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !conversation.uploadedFiles.chatFile) {
      return;
    }

    console.log(`=== INICIANDO PROCESAMIENTO DE ${conversation.name} ===`);

    // Marcar como procesando
    onUpdateConversation(conversationId, {
      isProcessing: true,
      processingState: {
        step: 'upload',
        progress: 5,
        currentAction: 'Iniciando procesamiento...'
      }
    });

    try {
      // Step 1: Parse chat file
      console.log('Paso 1: Parseando archivo de chat...');
      onUpdateConversation(conversationId, {
        processingState: {
          step: 'parsing',
          progress: 10,
          currentAction: 'Leyendo archivo de chat...'
        }
      });

      const chatText = await conversation.uploadedFiles.chatFile.text();
      const chatMessages = parseChatFile(chatText);
      const mediaFilesNeeded = extractMediaFiles(chatMessages);

      onUpdateConversation(conversationId, {
        processingState: {
          step: 'parsing',
          progress: 25,
          currentAction: `Encontrados ${chatMessages.length} mensajes y ${mediaFilesNeeded.length} archivos multimedia`
        }
      });

      // Step 2: Transcribe audio files
      onUpdateConversation(conversationId, {
        processingState: {
          step: 'transcribing',
          progress: 30,
          currentAction: 'Iniciando transcripción de audios...'
        }
      });

      const transcriptions: Record<string, string> = {};
      const audioFiles = conversation.uploadedFiles.mediaFiles.filter(file => 
        file.type.startsWith('audio/') || 
        file.name.includes('.opus') || 
        file.name.includes('.ogg') ||
        file.name.match(/\d{8}-AUDIO-.*\.opus$/i)
      );

      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        onUpdateConversation(conversationId, {
          processingState: {
            step: 'transcribing',
            progress: 30 + (i * 40) / audioFiles.length,
            currentAction: `Transcribiendo audio ${i + 1}/${audioFiles.length}: ${audioFile.name}`
          }
        });

        try {
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('fileName', audioFile.name);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const response = await fetch('/api/transcribe-gemini', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to transcribe ${audioFile.name}: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
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
      onUpdateConversation(conversationId, {
        processingState: {
          step: 'organizing',
          progress: 70,
          currentAction: 'Organizando conversación con IA...'
        }
      });

      const orgController = new AbortController();
      const orgTimeoutId = setTimeout(() => orgController.abort(), 120000);

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

      if (!organizeResponse.ok) {
        const errorText = await organizeResponse.text();
        throw new Error(`Failed to organize conversation: ${organizeResponse.status} ${organizeResponse.statusText}`);
      }

      const organizedData = await organizeResponse.json();
      const messages = organizedData.messages || [];

      onUpdateConversation(conversationId, {
        processingState: {
          step: 'complete',
          progress: 100,
          currentAction: `Conversación procesada exitosamente - ${messages.length} mensajes`
        },
        processedMessages: messages,
        isProcessing: false
      });

    } catch (error) {
      console.error(`=== ERROR EN PROCESAMIENTO DE ${conversation.name} ===`, error);
      
      onUpdateConversation(conversationId, {
        processingState: {
          step: 'complete',
          progress: 100,
          error: error instanceof Error ? error.message : 'Error desconocido'
        },
        isProcessing: false
      });
    }
  };

  const processAllConversations = async () => {
    const pendingConversations = conversations.filter(
      c => !c.isProcessing && c.processingState.step !== 'complete'
    );

    if (pendingConversations.length === 0) {
      return;
    }

    setIsProcessingAll(true);
    console.log(`=== INICIANDO PROCESAMIENTO DE ${pendingConversations.length} CONVERSACIONES ===`);

    // Procesar conversaciones secuencialmente para evitar sobrecarga
    for (const conversation of pendingConversations) {
      if (!conversation.isProcessing && conversation.processingState.step !== 'complete') {
        setActiveConversationId(conversation.id);
        await processConversation(conversation.id);
        // Pequeña pausa entre procesamientos para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessingAll(false);
    setActiveConversationId(null);
    console.log('=== PROCESAMIENTO MASIVO COMPLETADO ===');
  };

  const getStatusBadge = (conversation: Conversation) => {
    if (conversation.isProcessing) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Procesando
      </Badge>;
    }
    
    if (conversation.processingState.step === 'complete') {
      if (conversation.processingState.error) {
        return <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>;
      }
      return <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completado
      </Badge>;
    }
    
    return <Badge variant="outline">
      <Clock className="w-3 h-3 mr-1" />
      Pendiente
    </Badge>;
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const viewingConversation = conversations.find(c => c.id === viewingConversationId);

  if (viewingConversation && viewingConversation.processedMessages.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Conversación: {viewingConversation.name}</h2>
          <Button 
            variant="outline" 
            onClick={() => setViewingConversationId(null)}
          >
            Volver a la Lista
          </Button>
        </div>
        <ConversationView messages={viewingConversation.processedMessages} />
      </div>
    );
  }

  const pendingCount = conversations.filter(c => !c.isProcessing && c.processingState.step !== 'complete').length;
  const processingCount = conversations.filter(c => c.isProcessing).length;
  const completedCount = conversations.filter(c => c.processingState.step === 'complete' && !c.processingState.error).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Conversaciones ({conversations.length})</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {pendingCount} pendientes
              </Badge>
            )}
            {processingCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {processingCount} procesando
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {completedCount} completadas
              </Badge>
            )}
          </div>
        </div>
        
        {/* Process All Button */}
        {pendingCount > 0 && (
          <Button
            onClick={processAllConversations}
            disabled={isProcessingAll || processingCount > 0}
            size="sm"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isProcessingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando Todas...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Transcribir Todas ({pendingCount})
              </>
            )}
          </Button>
        )}
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No hay conversaciones cargadas</h3>
            <p className="text-gray-600">
              Sube archivos ZIP de WhatsApp para comenzar a transcribir múltiples conversaciones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="relative">
              <CardHeader className="pb-3 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 truncate">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                      <span className="truncate">{conversation.name}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 md:w-4 md:h-4" />
                        {conversation.uploadedFiles.mediaFiles.length} archivos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">{conversation.createdAt.toLocaleString()}</span>
                        <span className="sm:hidden">{conversation.createdAt.toLocaleDateString()}</span>
                      </span>
                      {conversation.processedMessages.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 md:w-4 md:h-4" />
                          {conversation.processedMessages.length} mensajes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(conversation)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 px-4 md:px-6">
                {/* Processing Steps */}
                {(conversation.isProcessing || activeConversationId === conversation.id) && (
                  <div className="mb-4">
                    <ProcessingSteps state={conversation.processingState} />
                  </div>
                )}

                {/* Error Display */}
                {conversation.processingState.error && (
                  <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error:</strong> {conversation.processingState.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {!conversation.isProcessing && conversation.processingState.step !== 'complete' && (
                    <Button
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        processConversation(conversation.id);
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Procesar
                    </Button>
                  )}
                  
                  {conversation.processedMessages.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setViewingConversationId(conversation.id)}
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Ver Transcripción</span>
                      <span className="sm:hidden">Ver</span>
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => onRemoveConversation(conversation.id)}
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-0" />
                    <span className="ml-2 sm:hidden">Eliminar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
