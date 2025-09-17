"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Image, Music, Video, X } from 'lucide-react';
import { UploadedFiles } from '@/types/chat';

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFiles) => void;
  uploadedFiles: UploadedFiles;
}

export default function FileUploader({ onFilesUploaded, uploadedFiles }: FileUploaderProps) {
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
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
  }, [onFilesUploaded, uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.opus', '.ogg'],
      'application/octet-stream': ['.opus']
    }
  });

  const removeMediaFile = (index: number) => {
    const newMediaFiles = uploadedFiles.mediaFiles.filter((_, i) => i !== index);
    onFilesUploaded({
      ...uploadedFiles,
      mediaFiles: newMediaFiles
    });
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
            Subir Archivos de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Suelta los archivos aquí...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">
                  Arrastra y suelta los archivos aquí, o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500">
                  Incluye el archivo _chat.txt y todos los archivos multimedia (audios, fotos, videos)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat File Preview */}
      {uploadedFiles.chatFile && (
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

      {/* Media Files Preview */}
      {uploadedFiles.mediaFiles.length > 0 && (
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