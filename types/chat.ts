export interface ChatMessage {
  timestamp: string;
  sender: string;
  content: string;
  type: 'text' | 'audio_transcript' | 'audio' | 'image' | 'video' | 'media';
  originalFile?: string;
  transcription?: string;
}

export interface ProcessingState {
  step: 'upload' | 'parsing' | 'transcribing' | 'organizing' | 'complete';
  progress: number;
  currentAction?: string;
  error?: string;
}

export interface UploadedFiles {
  chatFile: File | null;
  mediaFiles: File[];
}

// Nuevos tipos para múltiples conversaciones
export interface Conversation {
  id: string;
  name: string;
  uploadedFiles: UploadedFiles;
  processingState: ProcessingState;
  processedMessages: ChatMessage[];
  isProcessing: boolean;
  createdAt: Date;
}

export interface MultipleConversationsState {
  conversations: Conversation[];
  activeConversationId: string | null;
}