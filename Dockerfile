# Etapa 1: Construcción (Build)
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite incrusta la URL de la API al compilar
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: Servidor Web (Nginx) - Para que sea ligero y rápido
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos la configuración de nginx (ver abajo)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]