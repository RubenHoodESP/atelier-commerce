# Backend image for the deployed BFF + fictional provider (one process, one instance).
# The storefront is deployed separately (Vercel) and is not part of this image.

# Build stage: full install (TypeScript is a dev dependency) and compile the three backend packages.
FROM node:22.23.5-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/middleware/package.json apps/middleware/
COPY apps/mock-services/package.json apps/mock-services/
COPY apps/storefront/package.json apps/storefront/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/mock-services apps/mock-services
COPY apps/middleware apps/middleware
RUN npm run build:services

# Runtime stage: production dependencies of the backend workspaces only (no Next/React).
FROM node:22.23.5-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/middleware/package.json apps/middleware/
COPY apps/mock-services/package.json apps/mock-services/
COPY apps/storefront/package.json apps/storefront/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --omit=dev --no-audit --no-fund -w @atelier/middleware -w @atelier/mock-services -w @atelier/contracts \
  && npm cache clean --force
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/apps/mock-services/dist apps/mock-services/dist
COPY --from=build /app/apps/middleware/dist apps/middleware/dist
COPY scripts/serve-backend.mjs scripts/
USER node
EXPOSE 4000
CMD ["node", "scripts/serve-backend.mjs"]
