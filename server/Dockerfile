FROM node:20-bookworm

# Python runtime + antiword for .doc processing in RAG pipeline
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv antiword \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend ./backend
COPY server ./server

WORKDIR /app/server
RUN npm run build && mkdir -p /tmp/uploads

ENV NODE_ENV=production
ENV BACKEND_DIR=/app/backend
ENV PYTHON_BIN=/opt/venv/bin/python

EXPOSE 3001

CMD ["npm", "run", "start"]
