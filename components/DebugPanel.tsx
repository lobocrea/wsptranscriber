"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bug, Play, RefreshCw } from 'lucide-react';

interface DebugPanelProps {
  uploadedFiles: any;
  onTestAPI: () => Promise<void>;
  onTestParser: () => Promise<void>;
  onClearLogs: () => void;
}

export default function DebugPanel({ uploadedFiles, onTestAPI, onTestParser, onClearLogs }: DebugPanelProps) {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testAPIConnection = async () => {
    setIsDebugging(true);
    addLog('🔍 Probando conexión API...');
    
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog('✅ API funcionando correctamente');
        addLog(`📊 Respuesta: ${JSON.stringify(data)}`);
      } else {
        addLog(`❌ Error API: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
    
    setIsDebugging(false);
  };

  const testChatParser = async () => {
    setIsDebugging(true);
    addLog('🔍 Probando parser de chat...');
    
    if (!uploadedFiles.chatFile) {
      addLog('❌ No hay archivo de chat cargado');
      setIsDebugging(false);
      return;
    }

    try {
      addLog(`📁 Archivo: ${uploadedFiles.chatFile.name} (${uploadedFiles.chatFile.size} bytes)`);
      
      const chatText = await uploadedFiles.chatFile.text();
      addLog(`📝 Contenido leído: ${chatText.length} caracteres`);
      addLog(`📝 Preview: ${chatText.substring(0, 100)}...`);
      
      // Test basic parsing
      const lines = chatText.split('\n');
      addLog(`📊 Líneas encontradas: ${lines.length}`);
      
      // Test regex pattern - updated for real format
      const messageRegex = /^‎?\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s[ap]\.\s?m\.)\]\s([^:]+):\s‎?(.+)$/;
      
      let validMessages = 0;
      let audioCount = 0;
      let photoCount = 0;
      let videoCount = 0;
      let mediaCount = 0;
      
      lines.slice(0, 10).forEach((line: string, index: number) => {
        const match = line.match(messageRegex);
        if (match) {
          validMessages++;
          const [, timestamp, sender, content] = match;
          
          // Detect media types
          if (content.includes('<adjunto:') && content.includes('AUDIO')) {
            audioCount++;
            addLog(`🎵 Línea ${index + 1}: Audio detectado - ${content.match(/<adjunto:\s*([^>]+)>/i)?.[1] || 'sin nombre'}`);
          } else if (content.includes('<adjunto:') && content.includes('PHOTO')) {
            photoCount++;
            addLog(`📸 Línea ${index + 1}: Foto detectada - ${content.match(/<adjunto:\s*([^>]+)>/i)?.[1] || 'sin nombre'}`);
          } else if (content.includes('<adjunto:') && content.includes('VIDEO')) {
            videoCount++;
            addLog(`🎬 Línea ${index + 1}: Video detectado - ${content.match(/<adjunto:\s*([^>]+)>/i)?.[1] || 'sin nombre'}`);
          } else if (content.includes('<adjunto:')) {
            mediaCount++;
            addLog(`📄 Línea ${index + 1}: Archivo detectado - ${content.match(/<adjunto:\s*([^>]+)>/i)?.[1] || 'sin nombre'}`);
          } else {
            addLog(`💬 Línea ${index + 1}: Texto - "${sender}": "${content.substring(0, 30)}..."`);
          }
        } else if (line.trim()) {
          addLog(`⚠️ Línea ${index + 1}: No coincide con patrón - "${line.substring(0, 50)}..."`);
        }
      });
      
      addLog(`📊 Resumen: ${validMessages} mensajes válidos, ${audioCount} audios, ${photoCount} fotos, ${videoCount} videos, ${mediaCount} otros archivos`);
      
    } catch (error) {
      addLog(`❌ Error parseando chat: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
    
    setIsDebugging(false);
  };

  const clearLogs = () => {
    setDebugLogs([]);
    addLog('🧹 Logs limpiados');
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Panel de Debug
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testAPIConnection} 
              disabled={isDebugging}
              size="sm"
              variant="outline"
            >
              <Play className="w-4 h-4 mr-2" />
              Test API
            </Button>
            
            <Button 
              onClick={testChatParser} 
              disabled={isDebugging || !uploadedFiles.chatFile}
              size="sm"
              variant="outline"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Parser
            </Button>
            
            <Button 
              onClick={clearLogs} 
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpiar Logs
            </Button>
          </div>

          {debugLogs.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {debugLogs.join('\n')}
                  </pre>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isDebugging && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Ejecutando debug...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
