#!/bin/sh
# dashboard/scripts/migrate.sh

set -e

echo "Running database migrations..."

# Drizzle ORMのマイグレーションを実行
npm run db:migrate

echo "Migrations completed successfully"
