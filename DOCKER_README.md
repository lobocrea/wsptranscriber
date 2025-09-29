# 🐳 Docker Setup para WSP Transcriber

Este proyecto incluye una configuración completa de Docker para desarrollo y producción.

## 📋 Requisitos Previos

- Docker Desktop instalado
- Docker Compose v2.0+
- Archivo `.env.local` configurado con las variables de entorno necesarias

## 🚀 Inicio Rápido

### Producción
```bash
# Construir y ejecutar en producción
docker-compose up -d

# Ver logs
docker-compose logs -f wsptranscriber
```

### Desarrollo
```bash
# Ejecutar en modo desarrollo con hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up wsptranscriber-dev
```

## 📁 Archivos Docker

- **`Dockerfile`** - Imagen optimizada para producción
- **`Dockerfile.dev`** - Imagen para desarrollo con hot reload
- **`docker-compose.yml`** - Configuración principal
- **`docker-compose.dev.yml`** - Override para desarrollo
- **`.dockerignore`** - Archivos excluidos del build
- **`docker-scripts.sh`** - Scripts de utilidad (Linux/Mac)

## 🛠️ Comandos Útiles

### Usando Docker Compose

```bash
# Construir imagen
docker-compose build

# Iniciar en background
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Detener servicios
docker-compose down

# Reiniciar servicio específico
docker-compose restart wsptranscriber

# Acceder al shell del contenedor
docker-compose exec wsptranscriber sh

# Limpiar todo (contenedores, imágenes, volúmenes)
docker-compose down --rmi all --volumes --remove-orphans
```

### Usando Scripts (Linux/Mac)

```bash
# Hacer ejecutable el script
chmod +x docker-scripts.sh

# Comandos disponibles
./docker-scripts.sh build    # Construir imagen
./docker-scripts.sh dev      # Modo desarrollo
./docker-scripts.sh prod     # Modo producción
./docker-scripts.sh stop     # Detener todo
./docker-scripts.sh logs     # Ver logs
./docker-scripts.sh clean    # Limpiar todo
./docker-scripts.sh shell    # Acceder al shell
./docker-scripts.sh restart  # Reiniciar
```

## 🔧 Configuración

### Variables de Entorno

Asegúrate de tener un archivo `.env.local` con las siguientes variables:

```env
# API Keys
GOOGLE_API_KEY=tu_api_key_de_google
OPENAI_API_KEY=tu_api_key_de_openai

# Configuración de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Otras variables específicas de tu proyecto
```

### Puertos

- **Producción**: `http://localhost:3000`
- **Desarrollo**: `http://localhost:3001`

### Volúmenes

- `uploads/` - Archivos temporales de uploads
- `logs/` - Logs de la aplicación

## 🏗️ Arquitectura Docker

### Imagen de Producción (Multi-stage)

1. **Base**: Node.js 18 Alpine
2. **Deps**: Instalación de dependencias
3. **Builder**: Build de la aplicación
4. **Runner**: Imagen final optimizada

### Características

- ✅ Multi-stage build para menor tamaño
- ✅ Usuario no-root para seguridad
- ✅ Health checks incluidos
- ✅ Optimización de capas
- ✅ Hot reload en desarrollo
- ✅ Volúmenes persistentes

## 🔍 Troubleshooting

### Problemas Comunes

**Error de permisos:**
```bash
# En Linux/Mac, dar permisos al script
chmod +x docker-scripts.sh
```

**Puerto ocupado:**
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Cambiar 3000 por otro puerto
```

**Problemas de build:**
```bash
# Limpiar cache de Docker
docker system prune -a
docker-compose build --no-cache
```

**Variables de entorno no cargadas:**
```bash
# Verificar que .env.local existe y tiene las variables correctas
cat .env.local
```

## 📊 Monitoreo

### Health Check

La aplicación incluye un health check que verifica:
- Respuesta HTTP en `/api/health`
- Intervalo: 30 segundos
- Timeout: 10 segundos
- Reintentos: 3

### Logs

```bash
# Ver logs en tiempo real
docker-compose logs -f wsptranscriber

# Ver logs específicos
docker-compose logs --tail=100 wsptranscriber
```

## 🚀 Despliegue

Para desplegar en producción:

1. Configurar variables de entorno de producción
2. Construir imagen: `docker-compose build`
3. Ejecutar: `docker-compose up -d`
4. Verificar health check: `docker-compose ps`

## 📝 Notas

- La imagen de producción usa `output: 'standalone'` de Next.js
- Los archivos estáticos se sirven desde el contenedor
- El hot reload solo funciona en modo desarrollo
- Los volúmenes persisten datos entre reinicios
