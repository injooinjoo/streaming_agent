FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN cd client && npm install --include=dev
RUN cd server && npm install

# Copy source code
COPY client ./client
COPY server ./server

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["node", "server/index.js"]
