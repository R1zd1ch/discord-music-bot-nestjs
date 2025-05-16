FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y curl unzip ffmpeg python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash \
  && mv /root/.bun/bin/bun /usr/local/bin/ \
  && mv /root/.bun/bin/bunx /usr/local/bin/

COPY bun.lock* package.json tsconfig.json ./
RUN bun install
RUN bun add @prisma/client prisma

COPY prisma ./prisma
RUN bunx run prisma generate
RUN bunx run prisma db push

COPY . .

RUN bun run build

CMD ["bun", "run", "dist/main.js"]
