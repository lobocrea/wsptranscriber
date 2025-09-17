# 🚀 WhatsApp Transcriber AI - Sistema Híbrido con Gemini

## 🎯 **NUEVA FUNCIONALIDAD: TRANSCRIPCIÓN HÍBRIDA**

### ✨ **Características Principales:**

#### **1. Transcripción Dual (OpenAI + Gemini)**
- **OpenAI Whisper**: Especializado en transcripción de audio
- **Gemini AI**: Soporta MÁS formatos y puede manejar archivos más grandes
- **Modo Híbrido**: Automáticamente usa el mejor proveedor disponible

#### **2. Soporte Universal de Formatos**
**Gemini AI soporta:**
```
✅ Formatos principales: mp3, wav, aiff, aac, ogg, flac
✅ Formatos de video: mp4, mov, avi, mpg, mpeg, mkv, webm
✅ Formatos específicos: m4a, wma, opus, 3gp, amr, awb
✅ Formatos avanzados: ac3, dts, ra, rm, au, snd, caf
✅ Formatos de mensajería: amr-nb, amr-wb (WhatsApp)
```

**OpenAI Whisper soporta:**
```
✅ Formatos estándar: mp3, mp4, mpeg, mpga, m4a, wav, webm
✅ Formatos adicionales: opus, flac, ogg
```

#### **3. Sistema Inteligente de Fallback**
1. **Prioridad Gemini**: Intenta primero (más formatos)
2. **Fallback OpenAI**: Si Gemini falla, usa OpenAI
3. **Detección de errores**: Cambia automáticamente si hay problemas
4. **Sin configuración**: Funciona con cualquier combinación de API keys

### 🔧 **APIs Creadas:**

#### **1. `/api/transcribe-gemini`**
- Transcripción exclusiva con Gemini AI
- Soporte para archivos hasta 20MB
- Manejo de todos los formatos de audio/video

#### **2. `/api/transcribe-hybrid`** ⭐ **PRINCIPAL**
- Sistema inteligente que usa ambos proveedores
- Fallback automático entre OpenAI y Gemini
- Selección automática del mejor proveedor

#### **3. `/api/upload-audio`** (Original)
- Solo OpenAI Whisper
- Mantenido para compatibilidad

### 🚀 **Cómo Usar:**

#### **Opción 1: Solo Gemini**
```bash
# .env.local
GEMINI_API_KEY=tu_gemini_key_aqui
```

#### **Opción 2: Solo OpenAI**
```bash
# .env.local
OPENAI_API_KEY=tu_openai_key_aqui
```

#### **Opción 3: Híbrido (Recomendado)** ⭐
```bash
# .env.local
OPENAI_API_KEY=tu_openai_key_aqui
GEMINI_API_KEY=tu_gemini_key_aqui
```

#### **Opción 4: Sin API Keys**
- Usa transcripción simulada automáticamente
- Perfecto para pruebas y desarrollo

### 📊 **Ventajas del Sistema Híbrido:**

#### **Gemini AI:**
- ✅ **Más formatos soportados** (30+ vs 10+)
- ✅ **Mejor manejo de archivos de WhatsApp**
- ✅ **Procesamiento de video con audio**
- ✅ **Formatos raros y específicos**
- ✅ **Gratis con límites generosos**

#### **OpenAI Whisper:**
- ✅ **Calidad de transcripción superior**
- ✅ **Mejor para inglés y español**
- ✅ **Más estable y confiable**
- ✅ **Archivos ligeramente más grandes (25MB)**

#### **Sistema Híbrido:**
- ✅ **Lo mejor de ambos mundos**
- ✅ **Fallback automático**
- ✅ **Sin configuración manual**
- ✅ **Máxima compatibilidad**

### 🔍 **Logs de Diagnóstico:**

El sistema ahora muestra información detallada:
```
Hybrid transcription API called
Available providers - OpenAI: true, Gemini: true
Trying Gemini first...
Gemini transcription result: [transcripción exitosa]
Used provider: gemini
```

### 📝 **Obtener API Keys:**

#### **Gemini AI (Gratis):**
1. Ve a https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta Google
3. Crea una nueva API key
4. Copia y pega en `.env.local`

#### **OpenAI (Pago por uso):**
1. Ve a https://platform.openai.com/api-keys
2. Crea una cuenta y agrega método de pago
3. Genera una nueva API key
4. Copia y pega en `.env.local`

### 🎯 **Casos de Uso Ideales:**

#### **Solo Gemini:**
- Archivos en formatos raros
- Presupuesto limitado
- Archivos de video con audio
- Desarrollo y pruebas

#### **Solo OpenAI:**
- Máxima calidad de transcripción
- Archivos en formatos estándar
- Producción crítica

#### **Híbrido:**
- Máxima compatibilidad
- Mejor experiencia de usuario
- Redundancia y confiabilidad
- Recomendado para todos los casos

### 🚨 **Limitaciones:**

#### **Gemini:**
- Archivos máximo ~20MB
- Puede ser más lento
- Calidad variable según formato

#### **OpenAI:**
- Menos formatos soportados
- Costo por uso
- Archivos máximo ~25MB

### 🎉 **Resultado:**

¡Ahora tu WhatsApp Transcriber puede manejar prácticamente CUALQUIER formato de audio que encuentres! El sistema híbrido garantiza la máxima compatibilidad y la mejor experiencia posible.

**¡Pruébalo ahora con tus archivos de audio más difíciles!** 🎵→📝
