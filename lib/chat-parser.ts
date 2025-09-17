export interface ChatMessage {
  timestamp: string;
  sender: string;
  content: string;
  type: 'text' | 'media' | 'audio' | 'image' | 'video';
  mediaFile?: string;
}

export function parseChatFile(chatText: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const lines = chatText.split('\n');
  
  // Updated regex to handle the actual WhatsApp format with invisible characters
  const messageRegex = /^‎?\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s[ap]\.\s?m\.)\]\s([^:]+):\s‎?(.+)$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(messageRegex);
    if (match) {
      const [, timestamp, sender, content] = match;
      
      // Check for multiline messages by looking ahead
      let fullContent = content;
      let j = i + 1;
      
      // Continue reading lines until we find another message or reach the end
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          j++;
          continue;
        }
        
        // If the next line is a new message, stop
        if (nextLine.match(messageRegex)) {
          break;
        }
        
        // Add this line to the current message content
        fullContent += '\n' + nextLine;
        j++;
      }
      
      // Update the loop counter to skip processed lines
      i = j - 1;
      
      let type: 'text' | 'media' | 'audio' | 'image' | 'video' = 'text';
      let mediaFile: string | undefined;
      
      // Detect audio files with the new format: <adjunto: 00000008-AUDIO-2025-07-28-10-17-40.opus>
      if (fullContent.includes('<adjunto:') && fullContent.includes('AUDIO')) {
        type = 'audio';
        // Extract filename from <adjunto: filename> format
        const fileMatch = fullContent.match(/<adjunto:\s*([^>]+)>/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.opus`;
        }
      }
      // Also handle traditional formats
      else if (fullContent.includes('audio omitido') ||
               fullContent.includes('Audio omitido') ||
               fullContent.includes('AUDIO OMITIDO') ||
               fullContent.match(/audio\s+omitido/i) ||
               fullContent.match(/voice\s+message/i) ||
               fullContent.includes('nota de voz') ||
               fullContent.includes('Nota de voz')) {
        type = 'audio';
        mediaFile = `audio_omitido_${Date.now()}.opus`;
      } 
      // Detect image files with the new format: <adjunto: 00000029-PHOTO-2025-07-30-17-31-29.jpg>
      else if (fullContent.includes('<adjunto:') && fullContent.includes('PHOTO')) {
        type = 'image';
        // Extract filename from <adjunto: filename> format
        const fileMatch = fullContent.match(/<adjunto:\s*([^>]+)>/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        }
      }
      // Also handle traditional formats
      else if (fullContent.includes('imagen omitida') ||
               fullContent.includes('Imagen omitida') ||
               fullContent.includes('IMAGEN OMITIDA') ||
               fullContent.match(/imagen\s+omitida/i) ||
               fullContent.match(/image\s+omitted/i) ||
               fullContent.includes('foto omitida') ||
               fullContent.includes('Foto omitida')) {
        type = 'image';
        mediaFile = `imagen_omitida_${Date.now()}.jpg`;
      }
      // Detect video files with the new format: <adjunto: 00000046-VIDEO-2025-08-01-16-29-54.mp4>
      else if (fullContent.includes('<adjunto:') && fullContent.includes('VIDEO')) {
        type = 'video';
        // Extract filename from <adjunto: filename> format
        const fileMatch = fullContent.match(/<adjunto:\s*([^>]+)>/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
        }
      }
      // Also handle traditional formats
      else if (fullContent.includes('video omitido') ||
               fullContent.includes('Video omitido') ||
               fullContent.includes('VIDEO OMITIDO') ||
               fullContent.match(/video\s+omitido/i) ||
               fullContent.match(/video\s+omitted/i) ||
               fullContent.includes('vídeo omitido') ||
               fullContent.includes('Vídeo omitido')) {
        type = 'video';
        mediaFile = `video_omitido_${Date.now()}.mp4`;
      }
      // Detect other media files (PDFs, documents, etc.)
      else if (fullContent.includes('<adjunto:') && (fullContent.includes('.pdf') || fullContent.includes('.doc') || fullContent.includes('.txt'))) {
        type = 'media';
        // Extract filename from <adjunto: filename> format
        const fileMatch = fullContent.match(/<adjunto:\s*([^>]+)>/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `document_${Date.now()}.pdf`;
        }
      }
      // Handle files with description before <adjunto:> like "CV Luis Guerraa.pdf • ‎1 página ‎<adjunto: 00000062-CV Luis Guerraa.pdf>"
      else if (fullContent.includes('<adjunto:') && !fullContent.includes('AUDIO') && !fullContent.includes('PHOTO') && !fullContent.includes('VIDEO')) {
        type = 'media';
        // Extract filename from <adjunto: filename> format
        const fileMatch = fullContent.match(/<adjunto:\s*([^>]+)>/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `file_${Date.now()}`;
        }
      }
      
      messages.push({
        timestamp: timestamp.trim(),
        sender: sender.trim(),
        content: fullContent.trim(),
        type,
        mediaFile
      });
    }
  }
  
  // Sort messages chronologically
  messages.sort((a, b) => {
    try {
      // Parse WhatsApp timestamp format: "25/7/25, 12:41:11 a. m."
      const parseTimestamp = (ts: string) => {
        // Handle the specific format: DD/MM/YY, HH:MM:SS a. m. or p. m.
        const parts = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+([ap])\.\s*m\./i);
        if (parts) {
          let [, day, month, year, hour, minute, second, ampm] = parts;
          
          // Convert 2-digit year to 4-digit
          if (year.length === 2) {
            year = '20' + year;
          }
          
          // Convert to 24-hour format
          let hour24 = parseInt(hour);
          if (ampm.toLowerCase() === 'p' && hour24 !== 12) {
            hour24 += 12;
          } else if (ampm.toLowerCase() === 'a' && hour24 === 12) {
            hour24 = 0;
          }
          
          // Note: Using DD/MM/YY format (day first, then month)
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), parseInt(second));
        }
        return new Date(0); // fallback
      };
      
      const dateA = parseTimestamp(a.timestamp);
      const dateB = parseTimestamp(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    } catch (error) {
      return 0; // maintain original order if parsing fails
    }
  });
  
  return messages;
}

export function extractMediaFiles(messages: ChatMessage[]): string[] {
  return messages
    .filter(msg => msg.mediaFile)
    .map(msg => msg.mediaFile!)
    .filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates
}