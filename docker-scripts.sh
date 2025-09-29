#!/bin/bash

# Scripts de Docker para WSP Transcriber
# Uso: ./docker-scripts.sh [comando]

case "$1" in
  "build")
    echo "🔨 Construyendo imagen de producción..."
    docker-compose build wsptranscriber
    ;;
  "dev")
    echo "🚀 Iniciando entorno de desarrollo..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up wsptranscriber-dev
    ;;
  "prod")
    echo "🌟 Iniciando entorno de producción..."
    docker-compose up -d wsptranscriber
    ;;
  "stop")
    echo "⏹️ Deteniendo contenedores..."
    docker-compose down
    ;;
  "logs")
    echo "📋 Mostrando logs..."
    docker-compose logs -f wsptranscriber
    ;;
  "clean")
    echo "🧹 Limpiando contenedores e imágenes..."
    docker-compose down --rmi all --volumes --remove-orphans
    ;;
  "shell")
    echo "🐚 Accediendo al shell del contenedor..."
    docker-compose exec wsptranscriber sh
    ;;
  "restart")
    echo "🔄 Reiniciando aplicación..."
    docker-compose restart wsptranscriber
    ;;
  *)
    echo "📖 Uso: $0 {build|dev|prod|stop|logs|clean|shell|restart}"
    echo ""
    echo "Comandos disponibles:"
    echo "  build   - Construir imagen de producción"
    echo "  dev     - Iniciar entorno de desarrollo"
    echo "  prod    - Iniciar entorno de producción"
    echo "  stop    - Detener todos los contenedores"
    echo "  logs    - Ver logs de la aplicación"
    echo "  clean   - Limpiar contenedores e imágenes"
    echo "  shell   - Acceder al shell del contenedor"
    echo "  restart - Reiniciar la aplicación"
    ;;
esac
