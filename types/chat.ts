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