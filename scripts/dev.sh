#!/usr/bin/env bash
# 同时启动 Web (Next.js, :3000) 和瓦特引擎 (Go, :8088)
# 用法: bun run dev   （或 bash scripts/dev.sh）
set -euo pipefail

cd "$(dirname "$0")/.."

export ENGINE_URL="${ENGINE_URL:-http://localhost:8088}"

cleanup() {
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "⚡ 启动瓦特引擎  → http://localhost:8088"
go run ./packages/wattengine/cmd/server &

echo "🌐 启动 Web 前端 → http://localhost:3000"
bun --cwd apps/web run dev &

wait
