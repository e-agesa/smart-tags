# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN npm ci --ignore-scripts

# Copy source
COPY packages/server packages/server
COPY packages/web packages/web

# Build server
RUN npm run build:server

# Build web
RUN npm run build:web

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Install production deps only
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev --ignore-scripts -w packages/server

# Copy built server
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/server/src/views packages/server/dist/views

# Copy built web (serve as static from Express)
COPY --from=builder /app/packages/web/dist packages/web/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
