# Dockerfile para WSP Transcriber - Aplicación Next.js
# Usa imagen base de Node.js 18 Alpine para menor tamaño
FROM node:18-alpine AS base

# Instalar dependencias necesarias para compilación
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar dependencias
FROM base AS deps
# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Crear archivo .env.local vacío si no existe para evitar errores de build
RUN touch .env.local

# Deshabilitar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED 1

# Construir la aplicación
RUN npm run build

# Imagen de producción, copiar todos los archivos y ejecutar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Crear directorio .next con permisos correctos
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar archivos de build con permisos correctos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto 3000
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Comando para ejecutar la aplicación
CMD ["node", "server.js"]
