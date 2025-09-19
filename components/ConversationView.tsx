"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Download, User, Calendar, Volume2, Image, Video, FileText, Mic, FileDown } from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface ConversationViewProps {
  messages: ChatMessage[];
}

export default function ConversationView({ messages }: ConversationViewProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  
  const participants = Array.from(new Set(messages.map(msg => msg.sender)));
  const filteredMessages = selectedParticipant === 'all' 
    ? messages 
    : messages.filter(msg => msg.sender === selectedParticipant);

  const exportAsMarkdown = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const participantFilter = selectedParticipant === 'all' ? 'Todos los participantes' : selectedParticipant;
    
    let markdownContent = `# Conversación de WhatsApp Transcrita\n\n`;
    markdownContent += `**Fecha de exportación:** ${currentDate}\n`;
    markdownContent += `**Filtro aplicado:** ${participantFilter}\n`;
    markdownContent += `**Total de mensajes:** ${filteredMessages.length}\n`;
    markdownContent += `**Participantes:** ${participants.join(', ')}\n\n`;
    markdownContent += `---\n\n`;

    filteredMessages.forEach((msg, index) => {
      const timestamp = formatTimestamp(msg.timestamp);
      
      markdownContent += `## Mensaje ${index + 1}\n\n`;
      markdownContent += `**👤 Remitente:** ${msg.sender}\n`;
      markdownContent += `**📅 Fecha:** ${timestamp}\n`;
      
      switch (msg.type) {
        case 'audio_transcript':
          markdownContent += `**🎵 Tipo:** Audio Transcrito\n`;
          if (msg.originalFile) {
            markdownContent += `**📁 Archivo original:** \`${msg.originalFile}\`\n`;
          }
          markdownContent += `\n**Transcripción:**\n> ${msg.content.replace(/\n/g, '\n> ')}\n\n`;
          break;
        case 'audio':
          markdownContent += `**🎤 Tipo:** Audio (sin transcribir)\n`;
          if (msg.originalFile) {
            markdownContent += `**📁 Archivo:** \`${msg.originalFile}\`\n`;
          }
          markdownContent += `\n**Contenido:** ${msg.content}\n\n`;
          break;
        case 'image':
          markdownContent += `**🖼️ Tipo:** Imagen\n`;
          if (msg.originalFile) {
            markdownContent += `**📁 Archivo:** \`${msg.originalFile}\`\n`;
          }
          if (msg.content && msg.content !== msg.originalFile) {
            markdownContent += `\n**Descripción:** ${msg.content}\n\n`;
          } else {
            markdownContent += `\n`;
          }
          break;
        case 'video':
          markdownContent += `**🎥 Tipo:** Video\n`;
          if (msg.originalFile) {
            markdownContent += `**📁 Archivo:** \`${msg.originalFile}\`\n`;
          }
          if (msg.content && msg.content !== msg.originalFile) {
            markdownContent += `\n**Descripción:** ${msg.content}\n\n`;
          } else {
            markdownContent += `\n`;
          }
          break;
        case 'media':
          markdownContent += `**📄 Tipo:** Archivo\n`;
          if (msg.originalFile) {
            markdownContent += `**📁 Archivo:** \`${msg.originalFile}\`\n`;
          }
          markdownContent += `\n**Contenido:** ${msg.content}\n\n`;
          break;
        default:
          markdownContent += `**💬 Tipo:** Mensaje de texto\n`;
          markdownContent += `\n**Contenido:** ${msg.content}\n\n`;
          break;
      }
      
      markdownContent += `---\n\n`;
    });

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-transcripcion-${currentDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const participantFilter = selectedParticipant === 'all' ? 'Todos los participantes' : selectedParticipant;
    
    let textContent = `CONVERSACIÓN DE WHATSAPP TRANSCRITA\n`;
    textContent += `${'='.repeat(50)}\n\n`;
    textContent += `Fecha de exportación: ${currentDate}\n`;
    textContent += `Filtro aplicado: ${participantFilter}\n`;
    textContent += `Total de mensajes: ${filteredMessages.length}\n`;
    textContent += `Participantes: ${participants.join(', ')}\n\n`;
    textContent += `${'='.repeat(50)}\n\n`;

    filteredMessages.forEach((msg, index) => {
      const timestamp = formatTimestamp(msg.timestamp);
      
      textContent += `MENSAJE ${index + 1}\n`;
      textContent += `${'-'.repeat(20)}\n`;
      textContent += `Remitente: ${msg.sender}\n`;
      textContent += `Fecha: ${timestamp}\n`;
      
      switch (msg.type) {
        case 'audio_transcript':
          textContent += `Tipo: [🎵 AUDIO TRANSCRITO]\n`;
          if (msg.originalFile) {
            textContent += `Archivo original: ${msg.originalFile}\n`;
          }
          textContent += `\nTranscripción:\n${msg.content}\n\n`;
          break;
        case 'audio':
          textContent += `Tipo: [🎤 AUDIO SIN TRANSCRIBIR]\n`;
          if (msg.originalFile) {
            textContent += `Archivo: ${msg.originalFile}\n`;
          }
          textContent += `\nContenido: ${msg.content}\n\n`;
          break;
        case 'image':
          textContent += `Tipo: [🖼️ IMAGEN]\n`;
          if (msg.originalFile) {
            textContent += `Archivo: ${msg.originalFile}\n`;
          }
          if (msg.content && msg.content !== msg.originalFile) {
            textContent += `\nDescripción: ${msg.content}\n\n`;
          } else {
            textContent += `\n`;
          }
          break;
        case 'video':
          textContent += `Tipo: [🎥 VIDEO]\n`;
          if (msg.originalFile) {
            textContent += `Archivo: ${msg.originalFile}\n`;
          }
          if (msg.content && msg.content !== msg.originalFile) {
            textContent += `\nDescripción: ${msg.content}\n\n`;
          } else {
            textContent += `\n`;
          }
          break;
        case 'media':
          textContent += `Tipo: [📄 ARCHIVO]\n`;
          if (msg.originalFile) {
            textContent += `Archivo: ${msg.originalFile}\n`;
          }
          textContent += `\nContenido: ${msg.content}\n\n`;
          break;
        default:
          textContent += `Tipo: [💬 MENSAJE DE TEXTO]\n`;
          textContent += `\nContenido: ${msg.content}\n\n`;
          break;
      }
      
      textContent += `${'-'.repeat(50)}\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-transcripcion-${currentDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'audio_transcript':
        return <Volume2 className="w-4 h-4 text-blue-600" />;
      case 'audio':
        return <Mic className="w-4 h-4 text-orange-600" />;
      case 'image':
        return <Image className="w-4 h-4 text-green-600" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'media':
        return <FileText className="w-4 h-4 text-orange-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    // Convert WhatsApp timestamp to readable format
    try {
      const cleanTimestamp = timestamp.replace(/[\[\]]/g, '').trim();
      // Try to format it better if possible
      const parts = cleanTimestamp.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([ap])\.?\s*m\.?/i);
      if (parts) {
        const [, date, time, ampm] = parts;
        return `${date} ${time} ${ampm.toLowerCase()}m`;
      }
      return cleanTimestamp;
    } catch {
      return timestamp;
    }
  };

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No hay mensajes para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversación Transcrita
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportAsMarkdown} variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar .MD
              </Button>
              <Button onClick={exportAsText} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar .TXT
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredMessages.length} mensajes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {participants.length} participantes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                {filteredMessages.filter(msg => msg.type === 'audio_transcript').length} audios transcritos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">
                {filteredMessages.filter(msg => msg.type === 'audio').length} audios sin transcribir
              </span>
            </div>
          </div>
          
          {/* Participant filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedParticipant === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedParticipant('all')}
            >
              Todos
            </Button>
            {participants.map(participant => (
              <Button
                key={participant}
                variant={selectedParticipant === participant ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedParticipant(participant)}
              >
                {participant}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <div className="space-y-3">
        {filteredMessages.map((message, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getMessageIcon(message.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {message.sender}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.type === 'audio_transcript' && (
                      <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                        <Volume2 className="w-3 h-3 mr-1" />
                        Audio Transcrito
                      </Badge>
                    )}
                    {message.type === 'audio' && (
                      <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                        <Mic className="w-3 h-3 mr-1" />
                        Audio
                      </Badge>
                    )}
                    {message.type === 'image' && (
                      <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                        <Image className="w-3 h-3 mr-1" />
                        Imagen
                      </Badge>
                    )}
                    {message.type === 'video' && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Badge>
                    )}
                    {message.type === 'media' && (
                      <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                        <FileText className="w-3 h-3 mr-1" />
                        Archivo
                      </Badge>
                    )}
                    {message.originalFile && (
                      <Badge variant="secondary" className="text-xs">
                        {message.originalFile}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    {message.type === 'audio_transcript' ? (
                      <div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Volume2 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Transcripción de Audio</span>
                          </div>
                          <p className="text-blue-900 whitespace-pre-wrap font-medium leading-relaxed">
                            {message.content}
                          </p>
                          {message.originalFile && (
                            <p className="text-xs text-blue-600 mt-3 opacity-75 font-mono">
                              📁 {message.originalFile}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'audio' ? (
                      <div>
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Mic className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">Audio sin Transcribir</span>
                          </div>
                          <p className="text-orange-900 whitespace-pre-wrap mb-3">
                            {message.content}
                          </p>
                          {message.originalFile && (
                            <div className="bg-white border-2 border-dashed border-orange-300 rounded-lg p-4 text-center">
                              <Mic className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                              <p className="text-sm text-orange-700 font-medium">📁 {message.originalFile}</p>
                              <p className="text-xs text-orange-600 mt-1">Audio del chat original</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'image' ? (
                      <div>
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Image className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Imagen Compartida</span>
                          </div>
                          {message.content && message.content !== message.originalFile && (
                            <p className="text-green-900 whitespace-pre-wrap mb-3">
                              {message.content}
                            </p>
                          )}
                          {message.originalFile && (
                            <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-4 text-center">
                              <Image className="w-8 h-8 mx-auto mb-2 text-green-500" />
                              <p className="text-sm text-green-700 font-medium">📁 {message.originalFile}</p>
                              <p className="text-xs text-green-600 mt-1">Imagen del chat original</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'video' ? (
                      <div>
                        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Video Compartido</span>
                          </div>
                          {message.content && message.content !== message.originalFile && (
                            <p className="text-purple-900 whitespace-pre-wrap mb-3">
                              {message.content}
                            </p>
                          )}
                          {message.originalFile && (
                            <div className="bg-white border-2 border-dashed border-purple-300 rounded-lg p-4 text-center">
                              <Video className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                              <p className="text-sm text-purple-700 font-medium">📁 {message.originalFile}</p>
                              <p className="text-xs text-purple-600 mt-1">Video del chat original</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'media' ? (
                      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Archivo Compartido</span>
                        </div>
                        <p className="text-orange-900 whitespace-pre-wrap mb-3">
                          {message.content}
                        </p>
                        {message.originalFile && (
                          <div className="bg-white border-2 border-dashed border-orange-300 rounded-lg p-4 text-center">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                            <p className="text-sm text-orange-700 font-medium">📁 {message.originalFile}</p>
                            <p className="text-xs text-orange-600 mt-1">Archivo del chat original</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}