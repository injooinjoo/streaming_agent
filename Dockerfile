# ===========================================
# Stage 1: Install Server Dependencies
# ===========================================
FROM node:20-alpine AS server-deps

WORKDIR /app/server

# Install build dependencies for native modules (bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ===========================================
# Stage 2: Production Image
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

# Copy server source (includes public/ with monitor.html)
COPY server/ ./server/

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables (Cloud Run uses PORT=8080 by default)
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Health check (Cloud Run also supports HTTP startup/liveness probes)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "server/index.js"]
