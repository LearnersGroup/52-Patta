FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001
USER nodeuser

EXPOSE 4000

CMD ["node", "server.js"]
