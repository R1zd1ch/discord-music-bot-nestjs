#!/bin/sh
echo "Running Prisma migration..."
bun run prisma db push

echo "Starting app..."
exec bun run dist/main.js
