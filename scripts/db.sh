#!/usr/bin/env bash
# 连接 Supabase 数据库的便捷入口
# 用法:
#   bash scripts/db.sh                          # 进入交互式 psql
#   bash scripts/db.sh -c "select * from scenarios"   # 直接执行 SQL
#   bash scripts/db.sh -f <file.sql>            # 执行 SQL 文件（如迁移）
set -euo pipefail

cd "$(dirname "$0")/.."

# 从 apps/web/.env.local 读取 DATABASE_URL
DATABASE_URL=$(grep '^DATABASE_URL=' apps/web/.env.local | cut -d= -f2-)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ 未在 apps/web/.env.local 中找到 DATABASE_URL" >&2
  exit 1
fi

exec psql "$DATABASE_URL" "$@"
