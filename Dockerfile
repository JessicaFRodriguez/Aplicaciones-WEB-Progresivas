# =============================
# Etapa 1 - Construcción backend
# =============================
FROM node:18 AS build

# Directorio de trabajo dentro del contenedor
WORKDIR /app/server

# Copiamos dependencias del backend
COPY server/package*.json ./
RUN npm install

# Copiamos el código del backend
COPY server .

# =============================
# Etapa final - App completa
# =============================
FROM node:18

WORKDIR /app

# Copiamos el backend ya listo
COPY --from=build /app/server ./server

# Copiamos el frontend (html, css, js, imágenes, assets, etc.)
COPY ./*.html ./
COPY ./css ./css
COPY ./img ./img
COPY ./scripts ./scripts
COPY ./assets ./assets
COPY ./assets/icons ./assets/icons
COPY ./app.js ./
COPY ./manifest.json ./
COPY ./sw.js ./

# Eliminamos la carpeta login dentro de assets (ya no se necesita)
RUN rm -rf ./assets/login || true

# Instalamos dependencias del backend
WORKDIR /app/server
RUN npm install --omit=dev

# Exponemos el puerto del servidor
EXPOSE 3000

# Iniciamos el servidor
CMD ["node", "index.js"]
