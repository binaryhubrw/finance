# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Guarantee the dir exists for the runtime COPY even if brand assets are absent.
RUN mkdir -p public

RUN npm run build

# Drop devDependencies so the runtime image only carries what `next start` needs.
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

# A named volume mounted here inherits this ownership on first use, so the
# unprivileged runtime user can actually write receipts into it.
RUN mkdir -p /data/uploads && chown -R node:node /data
ENV UPLOAD_DIR=/data/uploads

USER node

EXPOSE 3000

CMD ["npm", "start"]
