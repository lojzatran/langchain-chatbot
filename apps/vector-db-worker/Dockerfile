# Base image
FROM node:22-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the worker
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx nx build vector-db-worker

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application (includes generated package.json)
COPY --from=builder /app/dist/apps/vector-db-worker ./

# Install only production dependencies
RUN npm install --omit=dev

# Start the worker
CMD ["node", "main.js"]
