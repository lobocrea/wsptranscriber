"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Image, Music, Video, X, Archive, Loader2 } from 'lucide-react';
import { UploadedFiles, Conversation } from '@/types/chat';
import { extractWhatsAppZip, isValidZipFile, getZipInfo } from '@/lib/zip-handler';

interface FileUploaderProps {
  onFilesUploaded?: (files: UploadedFiles) => void;
  uploadedFiles?: UploadedFiles;
  onConversationAdded?: (conversation: Conversation) => void;
  multipleMode?: boolean;
}

export default function FileUploader({ 
  onFilesUploaded, 
  uploadedFiles = { chatFile: null, mediaFiles: [] }, 
  onConversationAdded,
  multipleMode = false 
}: FileUploaderProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [zipInfo, setZipInfo] = useState<{
    fileName: string;
    totalFiles: number;
    hasChatFile: boolean;
    estimatedMediaFiles: number;
  } | null>(null);
  const [extractedConversations, setExtractedConversations] = useState<Conversation[]>([]);

  const handleZipExtraction = async (zipFile: File) => {
    setIsExtracting(true);
    setExtractionStatus('Analizando archivo ZIP...');
    
    try {
      // Primero obtener información básica del ZIP
      const info = await getZipInfo(zipFile);
      setZipInfo({
        fileName: zipFile.name,
        totalFiles: info.totalFiles,
        hasChatFile: info.hasChatFile,
        estimatedMediaFiles: info.estimatedMediaFiles
      });
      
      if (!info.hasChatFile) {
        setExtractionStatus('❌ No se encontró archivo _chat.txt en el ZIP');
        setIsExtracting(false);
        return;
      }
      
      setExtractionStatus(`Extrayendo ${info.totalFiles} archivos...`);
      
      // Extraer todos los archivos
      const result = await extractWhatsAppZip(zipFile);
      
      if (result.success) {
        setExtractionStatus(`✅ Extraídos: ${result.files.mediaFiles.length} archivos multimedia`);
        
        if (multipleMode && onConversationAdded) {
          // Crear nueva conversación
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const conversationName = zipFile.name.replace('.zip', '') || `Conversación ${new Date().toLocaleString()}`;
          
          const newConversation: Conversation = {
            id: conversationId,
            name: conversationName,
            uploadedFiles: result.files,
            processingState: { step: 'upload', progress: 0 },
            processedMessages: [],
            isProcessing: false,
            createdAt: new Date()
          };
          
          setExtractedConversations(prev => [...prev, newConversation]);
          onConversationAdded(newConversation);
        } else if (onFilesUploaded) {
          onFilesUploaded(result.files);
        }
      } else {
        setExtractionStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error extracting ZIP:', error);
      setExtractionStatus(`❌ Error al procesar ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (multipleMode) {
      // En modo múltiple, procesar todos los archivos ZIP
      const zipFiles = acceptedFiles.filter(file => isValidZipFile(file));
      
      if (zipFiles.length > 0) {
        console.log(`Processing ${zipFiles.length} ZIP files...`);
        for (const zipFile of zipFiles) {
          await handleZipExtraction(zipFile);
        }
        return;
      }
    } else {
      // Modo original: un solo archivo ZIP
      const zipFile = acceptedFiles.find(file => isValidZipFile(file));
      
      if (zipFile) {
        console.log('ZIP file detected, extracting...');
        await handleZipExtraction(zipFile);
        return;
      }
    }
    
    // Fallback al método original para archivos individuales (solo en modo single)
    if (!multipleMode && onFilesUploaded) {
      const chatFile = acceptedFiles.find(file => file.name.includes('_chat.txt'));
      const mediaFiles = acceptedFiles.filter(file => 
        !file.name.includes('_chat.txt') && 
        (file.type.startsWith('image/') || 
         file.type.startsWith('video/') || 
         file.type.startsWith('audio/') ||
         file.name.includes('.opus') ||
         file.name.includes('.ogg'))
      );

      const newFiles: UploadedFiles = {
        chatFile: chatFile || uploadedFiles.chatFile,
        mediaFiles: [...uploadedFiles.mediaFiles, ...mediaFiles]
      };

      onFilesUploaded(newFiles);
    }
  }, [onFilesUploaded, uploadedFiles, multipleMode, handleZipExtraction]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.opus', '.ogg'],
      'application/octet-stream': ['.opus']
    }
  });

  const removeMediaFile = (index: number) => {
    if (!onFilesUploaded) return;
    
    const newMediaFiles = uploadedFiles.mediaFiles.filter((_, i) => i !== index);
    onFilesUploaded({
      ...uploadedFiles,
      mediaFiles: newMediaFiles
    });
  };

  const removeConversation = (conversationId: string) => {
    setExtractedConversations(prev => prev.filter(conv => conv.id !== conversationId));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/') || file.name.includes('.opus')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {multipleMode ? 'Subir Múltiples Conversaciones de WhatsApp' : 'Subir Archivo de WhatsApp'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : isExtracting
                ? 'border-orange-300 bg-orange-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} disabled={isExtracting} />
            
            {isExtracting ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-orange-500 animate-spin" />
                <p className="text-orange-600 font-medium mb-2 text-sm md:text-base">Procesando archivo ZIP...</p>
                <p className="text-xs md:text-sm text-orange-500 px-2">{extractionStatus}</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-blue-500" />
                <p className="text-blue-600 font-medium text-sm md:text-base">Suelta el archivo aquí...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex gap-2 md:gap-4 mb-3 md:mb-4">
                  <Archive className="w-8 h-8 md:w-12 md:h-12 text-blue-500" />
                  <Upload className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2 text-sm md:text-base px-2">
                  {multipleMode 
                    ? 'Arrastra uno o más archivos ZIP de WhatsApp aquí' 
                    : 'Arrastra el archivo ZIP de WhatsApp aquí'
                  }
                </p>
                <p className="text-xs md:text-sm text-gray-500 mb-3 px-2">
                  {multipleMode 
                    ? 'Puedes subir múltiples conversaciones a la vez'
                    : 'O archivos individuales (_chat.txt + multimedia)'
                  }
                </p>
                <div className="bg-blue-50 p-2 md:p-3 rounded-lg text-xs md:text-sm mx-2 md:mx-0">
                  <p className="text-blue-700 font-medium mb-1">💡 Recomendado: Archivo ZIP</p>
                  <p className="text-blue-600 text-left">
                    {multipleMode 
                      ? 'Exporta cada chat desde WhatsApp con "Incluir archivos multimedia" y sube todos los archivos ZIP juntos.'
                      : 'Exporta el chat desde WhatsApp con "Incluir archivos multimedia" y sube directamente el archivo ZIP.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {zipInfo && (
            <Alert className="mt-4">
              <Archive className="h-4 w-4" />
              <AlertDescription>
                <strong>ZIP detectado:</strong> {zipInfo.fileName}<br/>
                📁 {zipInfo.totalFiles} archivos totales | 
                💬 {zipInfo.hasChatFile ? 'Chat encontrado' : 'Sin chat'} | 
                🎵 {zipInfo.estimatedMediaFiles} archivos multimedia
              </AlertDescription>
            </Alert>
          )}
          
          {extractionStatus && !isExtracting && (
            <Alert className={extractionStatus.includes('❌') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription>
                {extractionStatus}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Conversations Preview (Multiple Mode) */}
      {multipleMode && extractedConversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-600">
              ✓ Conversaciones Cargadas ({extractedConversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractedConversations.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Archive className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{conversation.name}</span>
                    <div className="text-xs text-gray-500">
                      {conversation.uploadedFiles.mediaFiles.length} archivos multimedia • 
                      Cargado: {conversation.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeConversation(conversation.id)}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat File Preview (Single Mode) */}
      {!multipleMode && uploadedFiles.chatFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-600">
              ✓ Archivo de Chat Cargado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">{uploadedFiles.chatFile.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {(uploadedFiles.chatFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Files Preview (Single Mode) */}
      {!multipleMode && uploadedFiles.mediaFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Archivos Multimedia ({uploadedFiles.mediaFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {uploadedFiles.mediaFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  {getFileIcon(file)}
                  <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMediaFile(index)}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}