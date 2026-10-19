# Build cả monorepo rồi chạy server Node (Fastify + Socket.IO)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

RUN npm ci

COPY . .

RUN npm run build -w @cardverse/shared && npm run build -w @cardverse/server

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]
