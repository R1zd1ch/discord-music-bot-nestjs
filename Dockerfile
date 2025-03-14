FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN pnpm install

RUN apk add --no-cache ffmpeg

COPY . .

RUN npx prisma generate

RUN pnpm run build

CMD ["pnpm", "run", "start:prod"]