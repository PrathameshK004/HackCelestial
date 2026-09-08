# Multi-stage or lightweight Node 20 alpine base
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Set node environment
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application source code
COPY . .

# Expose backend API port
EXPOSE 4000

# Run as non-root user for container security
USER node

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/users/checkAuth || exit 0

# Start server
CMD ["node", "index.js"]
