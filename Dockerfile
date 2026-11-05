# Standalone server for a VPS. Vercel deploys do not use this file.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV VITE_AUTH_ENABLED=false
ENV DEPLOY_TARGET=node
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=build --chown=node:node /app/.output ./.output
EXPOSE 8080
USER node
CMD ["node", ".output/server/index.mjs"]
