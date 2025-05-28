FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV MCP_PORT=8080

EXPOSE 8080
CMD ["node","dist/index.js"]

