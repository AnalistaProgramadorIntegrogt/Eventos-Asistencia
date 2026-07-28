FROM node:22-alpine

WORKDIR /app

# Copiar archivos de configuración y Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Exponer el puerto del servidor (por defecto asumimos que Express usa algo como el 3000 o lo que esté configurado, ajusta si es necesario)
EXPOSE 3000

# Iniciar la aplicación
CMD ["npm", "start"]
