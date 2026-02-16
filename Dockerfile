# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY docs ./docs
ARG BUILD_VERSION
RUN VITE_BUILD_VERSION=${BUILD_VERSION:-$(date -u +%Y%m%d.%H%M%S)} npm run build

# Stage 2: Python backend (serves static + API)
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./server/
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

# Use shell form so ${PORT} is expanded at runtime (Koyeb sets PORT)
CMD sh -c "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"
