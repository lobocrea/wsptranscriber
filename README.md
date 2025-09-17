# 🎵 WhatsApp Transcriber AI

Convierte tus conversaciones de WhatsApp en texto transcrito completo usando **Gemini AI** con soporte universal para todos los formatos de audio.

## ✨ Características

- 🎵 **Transcripción Universal**: Soporta TODOS los formatos de audio (opus, mp3, wav, m4a, aac, ogg, flac, amr, 3gp, etc.)
- 🧠 **IA Avanzada**: Usa Gemini AI para transcripción y organización inteligente
- 📱 **Optimizado para WhatsApp**: Maneja perfectamente archivos .opus y otros formatos de mensajería
- 🆓 **Gratis**: Gemini AI ofrece límites generosos sin costo
- 📄 **Parsing Inteligente**: Detecta automáticamente mensajes, audios, fotos, videos y documentos

## 🚀 Cómo usar

### 1. Configurar API Key (Opcional)

Para transcripción real, obtén una API key gratuita de Gemini:

1. Ve a https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta Google
3. Crea una nueva API key
4. Copia el archivo `.env.example` como `.env.local`
5. Agrega tu API key:

```bash
GEMINI_API_KEY=tu_gemini_api_key_aqui
```

### 2. Exportar chat de WhatsApp

1. Abre WhatsApp en tu teléfono
2. Ve al chat que quieres transcribir
3. Toca los 3 puntos → "Más" → "Exportar chat"
4. Selecciona "Incluir archivos multimedia"
5. Guarda el archivo ZIP

### 3. Usar la aplicación

1. Sube el archivo `_chat.txt` del ZIP
2. Sube los archivos de audio (.opus, .m4a, etc.)
3. Haz clic en "Iniciar Transcripción con Gemini AI"
4. ¡Espera a que se complete la transcripción!

## 🎯 Formatos Soportados

### Audio
- **WhatsApp**: `.opus`, `.amr`, `.3gp`
- **Estándar**: `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.flac`
- **Otros**: `.wma`, `.aiff`, `.awb`, `.ac3`, `.dts`, `.ra`, `.rm`, `.au`, `.snd`, `.caf`

### Video (extrae audio)
- `.mp4`, `.mov`, `.avi`, `.mpg`, `.mpeg`, `.mkv`, `.webm`

### Otros archivos detectados
- **Fotos**: `.jpg`, `.png`, `.gif`, `.webp`
- **Videos**: `.mp4`, `.mov`, `.avi`
- **Documentos**: `.pdf`, `.doc`, `.txt`, etc.

## 🔧 Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📝 Tecnologías

- **Next.js 14** - Framework React
- **Gemini AI** - Transcripción y organización
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Shadcn/ui** - Componentes UI

## 🎉 Resultado

La aplicación genera una transcripción completa y organizada cronológicamente de toda tu conversación de WhatsApp, convirtiendo todos los audios en texto legible.

---

**¡Perfecto para documentar conversaciones importantes, crear resúmenes de reuniones, o simplemente tener un registro textual de tus chats!** 📝✨
