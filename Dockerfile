# Use the official Bun image as the base
FROM oven/bun:1.2.16 as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Production stage
FROM oven/bun:1.2.16-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy built application and worker files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/wrangler.jsonc ./wrangler.jsonc

# Expose port 3000
EXPOSE 3000

# Copy the server script
COPY server.js ./

# Start the server
CMD ["bun", "server.js"] 