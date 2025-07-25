# Use official Node.js LTS version
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# Development stage
FROM base AS development

# Switch back to root for development dependencies
USER root

# Install development dependencies
RUN npm ci

# Install nodemon globally
RUN npm install -g nodemon

# Switch back to nodejs user
USER nodejs

# Override default command for development
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy built application (if you have a build step)
# COPY --from=builder /app/dist ./dist

# Use production command
CMD ["npm", "start"]