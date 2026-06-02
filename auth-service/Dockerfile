# ── Stage 1: Install all deps + generate Prisma client ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Full install (includes prisma CLI needed for generate)
RUN npm ci

COPY prisma ./prisma/
# Generate Prisma client binaries for linux/alpine target
RUN npx prisma generate

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
# Production-only deps (prisma CLI not needed at runtime)
RUN npm ci --omit=dev

# Copy the generated Prisma client from the builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application source and schema (needed for db push at startup)
COPY . .

EXPOSE 5003

# db push applies any schema drift before starting the server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node app.js"]