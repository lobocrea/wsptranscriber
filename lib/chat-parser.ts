export interface ChatMessage {
  timestamp: string;
  sender: string;
  content: string;
  type: 'text' | 'media' | 'audio' | 'image' | 'video';
  mediaFile?: string;
}

export function parseChatFile(chatText: string): ChatMessage[] {
  console.log('🔍 [PARSER] Starting chat file parsing...');
  console.log('📄 [PARSER] Chat text length:', chatText.length);
  console.log('📝 [PARSER] First 500 characters:', chatText.substring(0, 500));
  
  const messages: ChatMessage[] = [];
  const lines = chatText.split('\n');
  
  console.log('📊 [PARSER] Total lines to process:', lines.length);
  console.log('📝 [PARSER] First 5 lines:', lines.slice(0, 5));
  
  // Multiple regex patterns to handle different WhatsApp export formats
  const messagePatterns = [
    // Format: DD/M/YYYY, HH:MM a. m. - Sender: Message (NEW FORMAT - most common)
    /^(\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s[ap]\.\s?m\.)\s-\s([^:]+):\s(.+)$/i,
    // Format: DD/MM/YY, HH:MM a. m. - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s[ap]\.\s?m\.)\s-\s([^:]+):\s(.+)$/i,
    // Format: [DD/MM/YY, HH:MM:SS a. m.] Sender: Message (OLD FORMAT)
    /^‎?\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s[ap]\.\s?m\.)\]\s([^:]+):\s‎?(.+)$/i,
    // Format: DD/MM/YY, HH:MM - Sender: Message  
    /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)$/,
    // Format: DD/MM/YYYY, HH:MM - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)$/,
    // Format: [DD/MM/YY HH:MM:SS] Sender: Message
    /^‎?\[(\d{1,2}\/\d{1,2}\/\d{2,4}\s\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s‎?(.+)$/,
    // Format: DD/MM/YY HH:MM - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}\s\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)$/,
    // Format with AM/PM: DD/MM/YY, HH:MM AM/PM - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s[AP]M)\s-\s([^:]+):\s(.+)$/i,
    // Generic pattern: Any date/time format followed by dash and name with colon
    /^(.+?)\s-\s([^:]+):\s(.+)$/,
    // Very generic: timestamp in brackets, name with colon
    /^\[(.+?)\]\s([^:]+):\s(.+)$/,
  ];
  
  let parsedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try each pattern until one matches
    let match = null;
    let matchedPattern = -1;
    
    for (let p = 0; p < messagePatterns.length; p++) {
      match = line.match(messagePatterns[p]);
      if (match) {
        matchedPattern = p;
        break;
      }
    }
    
    if (match) {
      const [, timestamp, sender, content] = match;
      
      // Skip system messages (notifications, group creation, etc.)
      const isSystemMessage = (
        content.includes('Los mensajes y las llamadas están cifrados') ||
        content.includes('creó el grupo') ||
        content.includes('Se te añadió al grupo') ||
        content.includes('cambió el nombre del grupo') ||
        content.includes('cambió la descripción del grupo') ||
        content.includes('cambió la foto del grupo') ||
        content.includes('salió del grupo') ||
        content.includes('eliminó este mensaje') ||
        content.includes('Este mensaje fue eliminado') ||
        sender.includes('creó el grupo') ||
        sender.includes('Se te añadió')
      );
      
      if (isSystemMessage) {
        console.log(`⏭️ [PARSER] Skipping system message:`, content.substring(0, 50));
        continue;
      }
      
      parsedCount++;
      
      if (parsedCount <= 3) {
        console.log(`✅ [PARSER] Match found with pattern ${matchedPattern}:`, { timestamp, sender, content: content.substring(0, 50) });
      }
      
      // Check for multiline messages by looking ahead
      let fullContent = content;
      let j = i + 1;
      
      // Function to check if a line is a new message
      const isNewMessage = (testLine: string) => {
        for (const pattern of messagePatterns) {
          if (testLine.match(pattern)) {
            return true;
          }
        }
        return false;
      };
      
      // Continue reading lines until we find another message or reach the end
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          j++;
          continue;
        }
        
        // If the next line is a new message, stop
        if (isNewMessage(nextLine)) {
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
      
      // Detect audio files - NEW FORMAT: ‎PTT-20250923-WA0124.opus (archivo adjunto)
      if (fullContent.includes('PTT-') && fullContent.includes('.opus') && fullContent.includes('archivo adjunto')) {
        type = 'audio';
        // Extract filename from ‎PTT-...opus (archivo adjunto) format
        const fileMatch = fullContent.match(/‎?(PTT-[^.]+\.opus)/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.opus`;
        }
      }
      // Detect audio files with the old format: <adjunto: 00000008-AUDIO-2025-07-28-10-17-40.opus>
      else if (fullContent.includes('<adjunto:') && fullContent.includes('AUDIO')) {
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
      // Detect image files - NEW FORMAT: ‎IMG-20250926-WA0145.jpg (archivo adjunto)
      else if (fullContent.includes('IMG-') && (fullContent.includes('.jpg') || fullContent.includes('.jpeg') || fullContent.includes('.png')) && fullContent.includes('archivo adjunto')) {
        type = 'image';
        // Extract filename from ‎IMG-...jpg (archivo adjunto) format
        const fileMatch = fullContent.match(/‎?(IMG-[^.]+\.(jpg|jpeg|png|gif|webp))/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        }
      }
      // Detect image files with the old format: <adjunto: 00000029-PHOTO-2025-07-30-17-31-29.jpg>
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
      // Detect video files - NEW FORMAT: ‎VID-20250923-WA0132.mp4 (archivo adjunto)
      else if (fullContent.includes('VID-') && (fullContent.includes('.mp4') || fullContent.includes('.mov') || fullContent.includes('.avi')) && fullContent.includes('archivo adjunto')) {
        type = 'video';
        // Extract filename from ‎VID-...mp4 (archivo adjunto) format
        const fileMatch = fullContent.match(/‎?(VID-[^.]+\.(mp4|mov|avi|mkv|webm))/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
        }
      }
      // Detect video files with the old format: <adjunto: 00000046-VIDEO-2025-08-01-16-29-54.mp4>
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
      // Detect other files - NEW FORMAT: ‎Chat de WhatsApp con +34 637 62 87 94.zip (archivo adjunto)
      else if (fullContent.includes('archivo adjunto') && (fullContent.includes('.zip') || fullContent.includes('.pdf') || fullContent.includes('.doc') || fullContent.includes('.txt'))) {
        type = 'media';
        // Extract filename - look for common file extensions
        const fileMatch = fullContent.match(/‎?([^‎\n]+\.(zip|pdf|doc|docx|txt|xlsx|ppt|pptx))/i);
        if (fileMatch) {
          mediaFile = fileMatch[1].trim();
        } else {
          mediaFile = `document_${Date.now()}.pdf`;
        }
      }
      // Detect other media files (PDFs, documents, etc.) - OLD FORMAT
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
    } else {
      // Log lines that don't match any pattern (only first few for debugging)
      if (i < 10) {
        console.log(`❌ [PARSER] Line ${i} no match:`, line.substring(0, 100));
      }
    }
  }
  
  console.log(`📊 [PARSER] Parsing complete: ${messages.length} messages found`);
  console.log('📝 [PARSER] First message:', messages[0]);
  console.log('📝 [PARSER] Last message:', messages[messages.length - 1]);
  
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