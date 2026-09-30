FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/training-server/package.json apps/training-server/package.json
COPY packages/engine/package.json packages/engine/package.json
RUN npm ci

FROM dependencies AS build
COPY . .
ARG VITE_BACKEND_URL=ws://localhost:4000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build --workspace=@chess4/engine \
    && npm run build --workspace=@chess4/backend \
    && npm run build --workspace=@chess4/training-server \
    && npm run build --workspace=@chess4/frontend

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:22-alpine AS node-runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/engine/package.json ./packages/engine/package.json
COPY --from=build /app/packages/engine/dist ./packages/engine/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/training-server/package.json ./apps/training-server/package.json

FROM node-runtime AS backend
ENV PORT=4000
EXPOSE 4000
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
CMD ["node", "apps/backend/dist/index.js"]

FROM node-runtime AS training-server
ENV PORT=4100
EXPOSE 4100
COPY --from=build /app/apps/training-server/dist ./apps/training-server/dist
CMD ["node", "apps/training-server/dist/index.js"]

FROM nginx:alpine AS frontend
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80