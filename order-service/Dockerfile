# ── Stage 1: Install all deps + generate Prisma client ───────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY . .

EXPOSE 5002

CMD ["sh", "-c", "npx prisma db push --skip-generate && node app.js"]