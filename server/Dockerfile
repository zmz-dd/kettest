FROM node:18-slim
WORKDIR /app

# Install build dependencies for sqlite3 (if needed by node-gyp)
# node:18-slim is Debian based, much more stable for native modules than Alpine
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json .
# Ensure we rebuild sqlite3 for the current architecture
RUN npm install --build-from-source sqlite3

COPY . .
CMD ["node", "index.js"]
