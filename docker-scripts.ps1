# Scripts de Docker para WSP Transcriber (Windows PowerShell)
# Uso: .\docker-scripts.ps1 [comando]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "dev", "prod", "stop", "logs", "clean", "shell", "restart", "caddy-logs", "status")]
    [string]$Command
)

switch ($Command) {
    "build" {
        Write-Host "🔨 Construyendo imágenes..." -ForegroundColor Yellow
        docker compose build
    }
    "dev" {
        Write-Host "🚀 Iniciando entorno de desarrollo..." -ForegroundColor Green
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up wsptranscriber-dev
    }
    "prod" {
        Write-Host "🌟 Iniciando entorno de producción con Caddy..." -ForegroundColor Green
        docker compose up -d
    }
    "stop" {
        Write-Host "⏹️ Deteniendo contenedores..." -ForegroundColor Red
        docker compose down
    }
    "logs" {
        Write-Host "📋 Mostrando logs de la aplicación..." -ForegroundColor Cyan
        docker compose logs -f wsptranscriber
    }
    "caddy-logs" {
        Write-Host "📋 Mostrando logs de Caddy..." -ForegroundColor Cyan
        docker compose logs -f caddy
    }
    "clean" {
        Write-Host "🧹 Limpiando contenedores e imágenes..." -ForegroundColor Red
        docker compose down --rmi all --volumes --remove-orphans
    }
    "shell" {
        Write-Host "🐚 Accediendo al shell del contenedor de la aplicación..." -ForegroundColor Blue
        docker compose exec wsptranscriber sh
    }
    "restart" {
        Write-Host "🔄 Reiniciando aplicación..." -ForegroundColor Yellow
        docker compose restart wsptranscriber
    }
    "status" {
        Write-Host "📊 Estado de los contenedores..." -ForegroundColor Magenta
        docker compose ps
        Write-Host "`n🌐 URLs disponibles:" -ForegroundColor Green
        Write-Host "  - Producción: https://wsptranscriber.lobocrea.pro" -ForegroundColor White
        Write-Host "  - Admin Caddy: http://localhost:2019" -ForegroundColor White
    }
}

Write-Host "`n✅ Comando completado." -ForegroundColor Green
