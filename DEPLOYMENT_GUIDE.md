# 🚀 Guía de Despliegue - WSP Transcriber con Docker + Caddy

Esta guía te ayudará a desplegar WSP Transcriber en producción usando Docker y Caddy como proxy reverso.

## 📋 Requisitos Previos

- **Servidor** con Docker y Docker Compose instalados
- **Dominio** configurado apuntando al servidor
- **Puertos** 80 y 443 abiertos en el firewall
- **Git** instalado en el servidor

## 🔧 Configuración Inicial

### 1. **Clonar el Repositorio**
```bash
git clone https://github.com/lobocrea/wsptranscriber.git
cd wsptranscriber
```

### 2. **Configurar Variables de Entorno**
```bash
# Copiar plantilla de producción
cp .env.production .env.local

# Editar con valores reales
nano .env.local
```

**Variables críticas a configurar:**
- `GOOGLE_API_KEY` - Para transcripción con Gemini
- `NEXT_PUBLIC_APP_URL` - URL de tu dominio
- `JWT_SECRET` - Secreto único para JWT
- `SESSION_SECRET` - Secreto único para sesiones

### 3. **Configurar Dominio en Caddyfile**
```bash
# Editar Caddyfile con tu dominio
nano Caddyfile
```

Cambiar `wsptranscriber.lobocrea.pro` por tu dominio real.

## 🐳 Despliegue con Docker

### **Opción A: Despliegue Completo (Recomendado)**
```bash
# Construir y ejecutar con Caddy
docker compose up -d

# Verificar estado
docker compose ps

# Ver logs
docker compose logs -f
```

### **Opción B: Solo Aplicación (Sin Caddy)**
```bash
# Editar docker-compose.yml
# Descomentar las líneas:
# ports:
#   - "80:3000"

# Y comentar el servicio caddy

# Ejecutar
docker compose up -d wsptranscriber
```

## 🔍 Verificación

### **1. Estado de Contenedores**
```bash
docker compose ps
```

Deberías ver:
- `wsptranscriber-app` - **Up** (healthy)
- `wsptranscriber-caddy` - **Up**

### **2. Logs de la Aplicación**
```bash
# Logs de la aplicación
docker compose logs wsptranscriber

# Logs de Caddy
docker compose logs caddy
```

### **3. Pruebas de Conectividad**
```bash
# Desde el servidor
curl -I http://localhost

# Verificar SSL (si usas Caddy)
curl -I https://tu-dominio.com
```

## 🌐 Acceso a la Aplicación

Una vez desplegado, tu aplicación estará disponible en:

- **Con Caddy**: `https://tu-dominio.com` (SSL automático)
- **Sin Caddy**: `http://tu-dominio.com` o `http://IP-del-servidor`

## 📊 Monitoreo y Logs

### **Logs en Tiempo Real**
```bash
# Todos los servicios
docker compose logs -f

# Solo aplicación
docker compose logs -f wsptranscriber

# Solo Caddy
docker compose logs -f caddy
```

### **Admin Panel de Caddy**
Si habilitaste el admin panel, accede a:
```
http://localhost:2019
```

### **Archivos de Log**
Los logs se almacenan en:
- **Aplicación**: Volumen `logs:/app/logs`
- **Caddy**: `/var/log/caddy/` (dentro del contenedor)

## 🔧 Comandos Útiles

### **Scripts de Gestión**

**Linux/Mac:**
```bash
chmod +x docker-scripts.sh
./docker-scripts.sh prod    # Iniciar producción
./docker-scripts.sh stop    # Detener todo
./docker-scripts.sh logs    # Ver logs
./docker-scripts.sh status  # Ver estado
```

**Windows:**
```powershell
.\docker-scripts.ps1 prod    # Iniciar producción
.\docker-scripts.ps1 stop    # Detener todo
.\docker-scripts.ps1 logs    # Ver logs
.\docker-scripts.ps1 status  # Ver estado
```

### **Comandos Docker Directos**
```bash
# Reiniciar aplicación
docker compose restart wsptranscriber

# Reconstruir imagen
docker compose build --no-cache wsptranscriber

# Acceder al shell del contenedor
docker compose exec wsptranscriber sh

# Ver uso de recursos
docker stats
```

## 🔄 Actualizaciones

### **Actualizar Código**
```bash
# Detener servicios
docker compose down

# Actualizar código
git pull

# Reconstruir y ejecutar
docker compose build
docker compose up -d
```

### **Actualizar Solo Configuración**
```bash
# Si solo cambias Caddyfile o variables de entorno
docker compose restart caddy
docker compose restart wsptranscriber
```

## 🚨 Troubleshooting

### **Problema: Contenedor Unhealthy**
```bash
# Ver logs detallados
docker compose logs wsptranscriber

# Verificar health check
docker inspect wsptranscriber-app | grep -A 10 Health

# Acceder al contenedor
docker compose exec wsptranscriber sh
```

### **Problema: SSL No Funciona**
```bash
# Ver logs de Caddy
docker compose logs caddy

# Verificar DNS
dig tu-dominio.com

# Verificar puertos
sudo netstat -tlnp | grep :443
```

### **Problema: Puerto Ocupado**
```bash
# Ver qué usa el puerto 80
sudo lsof -i :80

# Detener servicio conflictivo
sudo systemctl stop apache2  # o nginx
```

### **Problema: Variables de Entorno**
```bash
# Verificar variables dentro del contenedor
docker compose exec wsptranscriber env | grep GOOGLE_API_KEY

# Editar .env.local y reiniciar
nano .env.local
docker compose restart wsptranscriber
```

## 📈 Optimizaciones de Producción

### **1. Recursos del Contenedor**
Agregar límites en `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
```

### **2. Backup de Volúmenes**
```bash
# Backup de uploads
docker run --rm -v wsptranscriber_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# Restore
docker run --rm -v wsptranscriber_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

### **3. Logs Rotation**
Los logs de Caddy ya tienen rotación configurada. Para la aplicación:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🔐 Seguridad

### **1. Firewall**
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### **2. Actualizar Sistema**
```bash
sudo apt update && sudo apt upgrade -y
```

### **3. Monitoreo de Logs**
```bash
# Instalar fail2ban para protección SSH
sudo apt install fail2ban
```

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs**: `docker compose logs`
2. **Verifica el estado**: `docker compose ps`
3. **Consulta esta guía**: Especialmente la sección de troubleshooting
4. **Revisa la documentación**: `DOCKER_README.md`

---

**¡Tu aplicación WSP Transcriber está lista para producción! 🎉**
