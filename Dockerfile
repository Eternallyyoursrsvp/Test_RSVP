# Multi-stage Docker build for Wedding RSVP Platform
# Production-ready containerization with security and performance optimization

# Stage 1: Build Stage
FROM node:18-alpine AS builder
LABEL maintainer="Wedding RSVP Platform Team"
LABEL version="5.0"
LABEL description="Enterprise Wedding RSVP Platform - Build Stage"

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY public/ ./public/

# Build the application
RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine AS production
LABEL maintainer="Wedding RSVP Platform Team"
LABEL version="5.0"
LABEL description="Enterprise Wedding RSVP Platform - Production"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache \
    dumb-init \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy server files
COPY --chown=nodejs:nodejs server/ ./server/
COPY --chown=nodejs:nodejs shared/ ./shared/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Security: Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]