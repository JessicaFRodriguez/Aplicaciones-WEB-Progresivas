# =============================
# Etapa 1 - Construcción backend
# =============================
FROM node:18 AS build

WORKDIR /app

# Copiar archivos de backend
COPY server/package*.json ./server/
RUN cd server && npm install

# Copiar todo el proyecto (frontend + backend)
COPY . .

# =============================
# Etapa final
# =============================
FROM node:18

WORKDIR /app

# Copiar resultado del build
COPY --from=build /app .

# Instalar dependencias del backend
WORKDIR /app/server
RUN npm install --omit=dev

# Exponer puerto
EXPOSE 3000

# Ejecutar servidor
CMD ["node", "index.js"]
