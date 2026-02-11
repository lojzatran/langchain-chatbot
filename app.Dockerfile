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

RUN SKIP_ENV_VALIDATION=true npm run build

# Stage 3: Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Install Node.js and necessary tools
RUN apk add --no-cache nodejs npm bash curl

# Copy built application and node_modules
COPY --from=builder /app ./

# Expose the application port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
