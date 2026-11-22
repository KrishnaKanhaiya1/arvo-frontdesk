# Multi-stage production build for Arvo Frontdesk Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and backend packages
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend
RUN npm ci

# Copy source code and build
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy build artifacts and dependencies
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
