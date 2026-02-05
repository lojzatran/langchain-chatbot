# Base image
FROM node:22-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine for Why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN SKIP_ENV_VALIDATION=true npm run build

# Stage 3: Production image, copy all the files and run next
FROM alpine/ollama AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Install Node.js and necessary tools
RUN apk add --no-cache nodejs npm bash curl

# Copy built application and node_modules
COPY --from=builder /app ./

# Pre-pull the models during build time
# We start the daemon, wait for it to be ready, pull the models, then kill the daemon
RUN (ollama serve &) && \
    until curl -s http://localhost:11434/api/tags > /dev/null; do sleep 1; done && \
    ollama pull nomic-embed-text && \
    ollama pull gemma3:1b && \
    pkill ollama

# Expose the application port
EXPOSE 8080

# Create a startup script to run both services
RUN printf '#!/bin/bash\n\
ollama serve &\n\
until curl -s http://localhost:11434/api/tags > /dev/null; do\n\
  sleep 1\n\
done\n\
exec npm start\n' > /app/start.sh && chmod +x /app/start.sh

# Use the startup script as the entry point
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
