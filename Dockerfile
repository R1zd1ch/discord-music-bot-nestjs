FROM node:20-slim

WORKDIR /app

# Установка curl, unzip, ffmpeg, python3, make и g++
RUN apt-get update \
  && apt-get install -y curl unzip ffmpeg python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash \
  && mv /root/.bun/bin/bun /usr/local/bin/ \
  && mv /root/.bun/bin/bunx /usr/local/bin/

# Копирование зависимостей и установка
COPY bun.lock* package.json tsconfig.json ./
RUN bun install
RUN bun add @prisma/client prisma

# Копируем Prisma-схему и генерируем клиента
COPY prisma ./prisma
RUN bun run prisma generate

# Копирование всего остального кода
COPY . .

# Сборка
RUN bun run build

# Запуск
CMD ["bun", "run", "dist/main.js"]
