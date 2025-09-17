# Archivos de Prueba para WhatsApp Transcriber

## Contenido

### sample_chat.txt
Archivo de chat de WhatsApp de ejemplo con:
- 15 mensajes de prueba
- 2 audios omitidos
- 1 imagen omitida
- 1 video omitido
- 2 archivos adjuntos específicos

### Archivos multimedia simulados
Para probar completamente el sistema, necesitarás:

1. **20231225-AUDIO-1043-12-25-10-43-45.opus** - Audio de WhatsApp
2. **IMG-20231225-WA0001.jpg** - Imagen de WhatsApp

## Cómo usar

1. Sube el archivo `sample_chat.txt` como archivo de chat
2. Sube archivos de audio reales (.opus, .ogg, .mp3) para probar la transcripción
3. Usa el panel de debug para verificar que el parsing funciona correctamente

## Formato esperado de WhatsApp

El parser reconoce estos formatos:
- `[MM/DD/YY, HH:MM:SS AM/PM] Nombre: Mensaje`
- `MM/DD/YY, HH:MM AM/PM - Nombre: Mensaje`

## Tipos de mensaje detectados

- **text**: Mensajes de texto normales
- **audio**: "audio omitido", archivos .opus, .ogg, etc.
- **image**: "imagen omitida", archivos .jpg, .png, etc.
- **video**: "video omitido", archivos .mp4, .mov, etc.
