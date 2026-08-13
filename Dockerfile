# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# The repo has no static assets yet, so guarantee the dir exists for the runtime COPY.
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

USER node

EXPOSE 3000

CMD ["npm", "start"]
