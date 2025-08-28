#!/bin/sh
# scripts/code-quality.sh
# -----------------------------------------------------------
# Maven 정적분석을 Docker Compose의 code-quality 컨테이너에서 실행
# - 실행 전제: infra/docker-compose.yml 존재, code-quality 서비스 정의
# - backend/pom.xml 기준으로 Checkstyle/PMD 실행
# -----------------------------------------------------------

set -euo pipefail

# 항상 리포 루트에서 실행
cd "$(git rev-parse --show-toplevel)"

# docker/compose 점검
command -v docker >/dev/null 2>&1 || { echo "❌ Docker 필요"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose 필요"; exit 1; }

# compose 파일 경로 고정 (infra/)
COMPOSE_FILE="infra/docker-compose.yml"
[ -f "$COMPOSE_FILE" ] || { echo "❌ $COMPOSE_FILE 없음"; exit 1; }
[ -f "backend/pom.xml" ] || { echo "ℹ️ backend/pom.xml 없음 → 정적분석 건너뜀"; exit 0; }

# 컨테이너에서 Maven 정적분석 실행 (TTY 미요구 -T)
docker compose -f "$COMPOSE_FILE" run --rm -T code-quality \
  bash -lc "cd backend && mvn -q -DskipTests \
    -Dcheckstyle.skip=false -Dpmd.skip=false \
    clean verify"