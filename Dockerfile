FROM node:22-alpine
ARG APP_VERSION=dev
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/data APP_VERSION=$APP_VERSION
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.js ./
COPY public ./public
# O container roda como "node" (uid 1000): a pasta data/ no host precisa ser desse uid.
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
