FROM node:20-alpine AS builder

WORKDIR /app

ENV DATABASE_URL="postgresql://brewlite:brewlite@db:5432/brewlite"

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://brewlite:brewlite@db:5432/brewlite"

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy || true; node dist/main.js"]
