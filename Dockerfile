# Build stage
FROM node:22-slim AS build

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from server directory
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy all source files
COPY . .

# Final stage
FROM node:22-slim

WORKDIR /app

# Copy built files from previous stage
COPY --from=build /app /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server/server.js"]
