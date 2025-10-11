# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# Install with devDependencies so Vite is available during build.
# Prefer npm ci when lockfile exists, otherwise fallback to npm/yarn/pnpm.
RUN if [ -f package-lock.json ]; then (npm ci --include=dev || npm install --include=dev); \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile --non-interactive; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install; \
    else npm install --include=dev; fi

COPY . .
# Run build with fallback to yarn/pnpm if npm script is unavailable
RUN npm run build || yarn build || (npm i -g pnpm && pnpm build)

# Stage 2: Nginx serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
