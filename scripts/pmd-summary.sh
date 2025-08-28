#!/bin/sh
# scripts/pmd-summary.sh
# PMD XML 리포트를 "파일:라인 | 룰 | 메시지" 한 줄씩 요약 출력 (BSD awk 호환)

set -euo pipefail

REPORT="backend/target/pmd.xml"
[ -f "$REPORT" ] || { echo "ℹ️ PMD 리포트가 없습니다: $REPORT"; exit 0; }

# 출력 개수 제한(없으면 0=전체)
LIMIT="${PMD_SUMMARY_LIMIT:-0}"

awk -v limit="$LIMIT" '
BEGIN {
  count = 0
  file = ""
  in_violation = 0
  msg = ""
}
# 파일 경로 추적 (<file name="..."> 형태)
index($0, "<file ") && match($0, /name="[^"]*"/) {
  # name="...": 따옴표 안만 추출
  s = substr($0, RSTART, RLENGTH)
  sub(/^name="/, "", s)
  sub(/"$/, "", s)
  file = s
  next
}
# violation 시작 태그에 rule, beginline 추출
index($0, "<violation") {
  in_violation = 1
  line = ""
  rule = ""
  msg = ""

  if (match($0, /beginline="[^"]*"/)) {
    bl = substr($0, RSTART, RLENGTH)
    sub(/^beginline="/, "", bl)
    sub(/"$/, "", bl)
    line = bl
  }
  if (match($0, /rule="[^"]*"/)) {
    rl = substr($0, RSTART, RLENGTH)
    sub(/^rule="/, "", rl)
    sub(/"$/, "", rl)
    rule = rl
  }

  # 현재 줄의 > 이후 텍스트를 메시지에 우선 취득
  txt = $0
  sub(/.*>/, "", txt)
  if (index(txt, "</violation>")) {
    sub(/<\/violation>.*/, "", txt)
    msg = txt
    in_violation = 0
    # 출력
    gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", msg)
    gsub(/&lt;/, "<", msg); gsub(/&gt;/, ">", msg); gsub(/&amp;/, "&", msg)
    printf "%s:%s | %s | %s\n", file, line, rule, msg
    count++
    if (limit > 0 && count >= limit) exit
  } else {
    msg = txt
  }
  next
}
# violation 본문 누적
in_violation && !index($0, "</violation>") {
  if (msg != "") msg = msg "\n" $0
  else msg = $0
  next
}
# violation 종료 처리
in_violation && index($0, "</violation>") {
  txt = $0
  sub(/<\/violation>.*/, "", txt)
  if (txt != "") {
    if (msg != "") msg = msg "\n" txt
    else msg = txt
  }
  in_violation = 0
  # 정리/출력
  gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", msg)
  gsub(/&lt;/, "<", msg); gsub(/&gt;/, ">", msg); gsub(/&amp;/, "&", msg)
  printf "%s:%s | %s | %s\n", file, line, rule, msg
  count++
  if (limit > 0 && count >= limit) exit
  next
}
' "$REPORT"