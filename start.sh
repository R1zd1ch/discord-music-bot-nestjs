#!/bin/sh

echo "Running Prisma migration..."
bun run prisma db push

echo "Starting Discord bot..."
exec bun run dist/main.js
