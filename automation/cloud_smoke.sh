#!/usr/bin/env bash
# Whyscape cloud smoke test: proves input -> cloud render -> persistent output for ONE short clip.
# Run inside a Claude Code cloud session from the repo root. Needs network to npm + Playwright CDN (+ apt for ffmpeg if missing).
# Result: outputs/SMOKE_<utc>/ (mp4 + env.txt + timing) committed to branch `smoke/<utc>` and pushed -> survives session end.
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ); OUT="outputs/SMOKE_$STAMP"; mkdir -p "$OUT"
log() { echo "[$(date -u +%T)] $*" | tee -a "$OUT/env.txt"; }
log "host: $(uname -a)"; log "cpus: $(nproc)  mem: $(free -g 2>/dev/null | awk '/Mem:/{print $2"G"}')"
command -v ffmpeg >/dev/null || { log "installing ffmpeg"; (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg) >>"$OUT/env.txt" 2>&1; }
log "ffmpeg: $(ffmpeg -version | head -1)"; log "node: $(node -v)"
T0=$(date +%s); npm ci --silent >>"$OUT/env.txt" 2>&1; npx playwright install --with-deps chromium >>"$OUT/env.txt" 2>&1; log "deps installed in $(( $(date +%s) - T0 ))s"
# 1) stills from the template (fonts, logo, brand, character) -> visual check
node series/engine/render.js episodes/_template_epXX stills 0.3 4.95 >>"$OUT/env.txt" 2>&1 && cp episodes/_template_epXX/out/*.png "$OUT/" 2>/dev/null || true
# 2) a real 10 s slice of the newest finished episode (heavy scenes) with its master mix -> render speed per video-second
EP=episodes/ep13_lebah_pulang; A=46; B=56
T1=$(date +%s); AUDIO="$PWD/$EP/audio/vo.mp3" node series/engine/render.js "$EP" video smoke.mp4 $A $B >>"$OUT/env.txt" 2>&1
DT=$(( $(date +%s) - T1 )); mv "$EP/out/smoke.mp4" "$OUT/ep13_${A}-${B}s.mp4"
log "render ${A}-${B}s (10 s of video) took ${DT}s  => ~$(( DT * 116 / 10 / 60 )) min for a full 116 s episode"
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,color_range -of compact "$OUT/ep13_${A}-${B}s.mp4" | tee -a "$OUT/env.txt"
fc-match Nunito >>"$OUT/env.txt" 2>&1 || true
git checkout -b "smoke/$STAMP"; git add -f "$OUT"; git commit -qm "smoke test $STAMP: cloud render proof"; git push -u origin "smoke/$STAMP"
log "PUSHED branch smoke/$STAMP  (check on GitHub after the session ends / laptop off)"
