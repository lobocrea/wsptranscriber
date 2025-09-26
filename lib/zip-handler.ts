import JSZip from 'jszip';

export interface ExtractedFiles {
  chatFile: File | null;
  mediaFiles: File[];
}

export interface ZipExtractionResult {
  success: boolean;
  files: ExtractedFiles;
  error?: string;
  totalFiles: number;
  chatFileName?: string;
}

/**
 * Extrae archivos de un ZIP de WhatsApp
 * Busca archivos de texto que contengan conversaciones de WhatsApp y todos los archivos multimedia
 */
export async function extractWhatsAppZip(zipFile: File): Promise<ZipExtractionResult> {
  try {
    console.log(`Extracting WhatsApp ZIP: ${zipFile.name} (${zipFile.size} bytes)`);
    
    // Cargar el archivo ZIP
    const zip = new JSZip();
    const zipData = await zipFile.arrayBuffer();
    const loadedZip = await zip.loadAsync(zipData);
    
    console.log('ZIP loaded successfully, analyzing contents...');
    
    let chatFile: File | null = null;
    const mediaFiles: File[] = [];
    let totalFiles = 0;
    let chatFileName = '';
    
    // Iterar sobre todos los archivos en el ZIP
    for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
      // Saltar directorios
      if (zipEntry.dir) {
        continue;
      }
      
      totalFiles++;
      const fileName = relativePath.split('/').pop() || relativePath;
      
      console.log(`Processing file: ${fileName}`);
      
      // Buscar archivos de chat de WhatsApp
      if (await isWhatsAppChatFile(fileName, zipEntry)) {
        console.log(`Found chat file: ${fileName}`);
        const content = await zipEntry.async('blob');
        chatFile = new File([content], fileName, { type: 'text/plain' });
        chatFileName = fileName;
        continue;
      }
      
      // Buscar archivos multimedia
      if (isMediaFile(fileName)) {
        console.log(`Found media file: ${fileName}`);
        const content = await zipEntry.async('blob');
        const mimeType = getMimeType(fileName);
        const mediaFile = new File([content], fileName, { type: mimeType });
        mediaFiles.push(mediaFile);
        continue;
      }
      
      console.log(`Skipping file: ${fileName} (not recognized as chat or media)`);
    }
    
    console.log(`Extraction complete: ${chatFile ? 'Chat file found' : 'No chat file'}, ${mediaFiles.length} media files`);
    
    if (!chatFile) {
      return {
        success: false,
        files: { chatFile: null, mediaFiles: [] },
        error: 'No se encontró un archivo de conversación de WhatsApp en el ZIP. Asegúrate de exportar el chat completo desde WhatsApp.',
        totalFiles,
        chatFileName: undefined
      };
    }
    
    return {
      success: true,
      files: { chatFile, mediaFiles },
      totalFiles,
      chatFileName
    };
    
  } catch (error) {
    console.error('Error extracting ZIP:', error);
    return {
      success: false,
      files: { chatFile: null, mediaFiles: [] },
      error: `Error al descomprimir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      totalFiles: 0
    };
  }
}

/**
 * Determina si un archivo es un chat de WhatsApp basándose en su nombre y contenido
 */
async function isWhatsAppChatFile(fileName: string, zipEntry: JSZip.JSZipObject): Promise<boolean> {
  // Verificar que sea un archivo de texto
  if (!fileName.toLowerCase().endsWith('.txt')) {
    return false;
  }
  
  // Patrones comunes de nombres de archivos de chat de WhatsApp
  const chatFilePatterns = [
    /_chat\.txt$/i,           // Formato tradicional: _chat.txt
    /chat\.txt$/i,            // Formato simple: chat.txt
    /conversacion\.txt$/i,    // Formato en español: conversacion.txt
    /conversation\.txt$/i,    // Formato en inglés: conversation.txt
    /whatsapp.*\.txt$/i,      // Cualquier archivo que contenga "whatsapp"
  ];
  
  // Verificar si el nombre del archivo coincide con algún patrón
  const matchesPattern = chatFilePatterns.some(pattern => pattern.test(fileName));
  
  if (matchesPattern) {
    console.log(`File ${fileName} matches WhatsApp chat pattern`);
    return true;
  }
  
  // Si no coincide con los patrones, verificar el contenido
  // Solo para archivos .txt que podrían ser chats
  try {
    // Leer una muestra del contenido (primeros 1000 caracteres)
    const content = await zipEntry.async('text');
    const sample = content.substring(0, 1000);
    
    // Patrones que indican que es un chat de WhatsApp
    const whatsappPatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*[AP]?M?\s*-\s*.+:/,  // Formato de fecha/hora de WhatsApp
      /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}:\d{2}\s*[AP]?M?\]/,   // Formato con corchetes
      /\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}:\d{2}\s*-\s*.+:/,                 // Formato con guiones
      /<Media omitted>/i,                                                    // Texto típico de WhatsApp
      /<Multimedia omitido>/i,                                               // Texto en español
      /Messages and calls are end-to-end encrypted/i,                        // Mensaje de encriptación
      /Los mensajes y las llamadas están cifrados de extremo a extremo/i     // Mensaje en español
    ];
    
    const isWhatsAppContent = whatsappPatterns.some(pattern => pattern.test(sample));
    
    if (isWhatsAppContent) {
      console.log(`File ${fileName} contains WhatsApp chat content patterns`);
      return true;
    }
    
    console.log(`File ${fileName} is a text file but doesn't contain WhatsApp patterns`);
    return false;
    
  } catch (error) {
    console.error(`Error reading content of ${fileName}:`, error);
    return false;
  }
}

/**
 * Determina si un archivo es multimedia basándose en su extensión
 */
function isMediaFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mediaExtensions = [
    // Audio
    'opus', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'amr', '3gp', 'awb',
    // Video
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'mpg', 'mpeg', '3gp',
    // Imágenes
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'heif',
    // Documentos comunes
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'
  ];
  
  return mediaExtensions.includes(extension);
}

/**
 * Obtiene el tipo MIME basándose en la extensión del archivo
 */
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    // Audio
    'opus': 'audio/opus',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/m4a',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'wma': 'audio/x-ms-wma',
    'amr': 'audio/amr',
    '3gp': 'audio/3gpp',
    'awb': 'audio/amr-wb',
    
    // Video
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    'mpg': 'video/mpeg',
    'mpeg': 'video/mpeg',
    
    // Imágenes
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'heic': 'image/heic',
    'heif': 'image/heif',
    
    // Documentos
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Valida que un archivo sea un ZIP válido
 */
export function isValidZipFile(file: File): boolean {
  return file.type === 'application/zip' || 
         file.type === 'application/x-zip-compressed' ||
         file.name.toLowerCase().endsWith('.zip');
}

/**
 * Obtiene información básica de un archivo ZIP sin extraerlo completamente
 */
export async function getZipInfo(zipFile: File): Promise<{
  totalFiles: number;
  hasChatFile: boolean;
  estimatedMediaFiles: number;
}> {
  try {
    const zip = new JSZip();
    const zipData = await zipFile.arrayBuffer();
    const loadedZip = await zip.loadAsync(zipData);
    
    let totalFiles = 0;
    let hasChatFile = false;
    let estimatedMediaFiles = 0;
    
    for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
      if (zipEntry.dir) continue;
      
      totalFiles++;
      const fileName = relativePath.split('/').pop() || relativePath;
      
      if (await isWhatsAppChatFile(fileName, zipEntry)) {
        hasChatFile = true;
      } else if (isMediaFile(fileName)) {
        estimatedMediaFiles++;
      }
    }
    
    return { totalFiles, hasChatFile, estimatedMediaFiles };
  } catch (error) {
    console.error('Error getting ZIP info:', error);
    return { totalFiles: 0, hasChatFile: false, estimatedMediaFiles: 0 };
  }
}
