# ===========================================
# Stage 1: Build Client
# ===========================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files first (for better caching)
COPY client/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy client source
COPY client/ ./

# Build client
RUN npm run build

# ===========================================
# Stage 2: Install Server Dependencies
# ===========================================
FROM node:20-alpine AS server-deps

WORKDIR /app/server

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ===========================================
# Stage 3: Production Image
# ===========================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy server dependencies from builder stage
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built client from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Copy server source
COPY server/ ./server/

# Copy root package.json (if needed for scripts)
COPY package*.json ./

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "server/index.js"]
