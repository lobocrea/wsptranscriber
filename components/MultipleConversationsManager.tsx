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
  Loader2
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Conversaciones ({conversations.length})</h2>
        {conversations.some(c => c.isProcessing) && (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {conversations.filter(c => c.isProcessing).length} procesando
          </Badge>
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
        <div className="grid grid-cols-1 gap-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {conversation.name}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {conversation.uploadedFiles.mediaFiles.length} archivos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {conversation.createdAt.toLocaleString()}
                      </span>
                      {conversation.processedMessages.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {conversation.processedMessages.length} mensajes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conversation)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
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

                {/* Action Buttons */}
                <div className="flex gap-2">
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
                      Ver Transcripción
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => onRemoveConversation(conversation.id)}
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
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
