#!/bin/bash
# Whyscape: tools a FRESH cloud session needs for /eksekusizip intake and unattended production (render, audio, Whisper, RAR/7z).
# Run by the session itself as its first step (no environment setup script needed):  bash automation/production/bootstrap.sh
# Idempotent; prints one line per tool; exit ≠ 0 if anything required is missing afterwards.
set -e
export DEBIAN_FRONTEND=noninteractive
cd "$(dirname "$0")/../.."
command -v 7z >/dev/null && command -v unrar-free >/dev/null || { apt-get install -y -qq unrar-free p7zip-full >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq unrar-free p7zip-full >/dev/null; }; }
# ONE Python for install, checks and the pipeline (25 Nov 2026: a routine container had python3 = 3.11 but pip = 3.13, so the
# packages went to 3.13 and the 3.11 check failed). The pins need Python >= 3.12 (numpy 2.5.3 / scipy 1.18.1 ship no 3.11 wheel).
# Pick python3 if it is >= 3.12, else the newest python3.13 / python3.12 on PATH; install with "$PY -m pip" (never a bare pip);
# then make "python3" (used by safe_extract, preflight, audio scripts) resolve to that same interpreter.
PIP_PKGS="numpy==2.5.3 scipy==1.18.1 sherpa-onnx==2.0.2"
SHIM_DIR=${WHYSCAPE_SHIM_DIR:-/usr/local/bin}
pyok() { "$1" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; }
PY=""
for c in python3 python3.13 python3.12; do p=$(command -v $c 2>/dev/null) || continue; if pyok "$p"; then PY=$(readlink -f "$p"); break; fi; done
if [ -z "$PY" ]; then echo "MISSING python >= 3.12 (python3 is $(python3 --version 2>&1)); numpy 2.5.3 / scipy 1.18.1 need >= 3.12"; exit 1; fi
"$PY" -m pip --version >/dev/null 2>&1 || "$PY" -m ensurepip -q >/dev/null 2>&1 || { apt-get install -y -qq python3-pip >/dev/null 2>&1 || true; }
"$PY" -c "import numpy, scipy, sherpa_onnx" 2>/dev/null || "$PY" -m pip install -q $PIP_PKGS 2>/dev/null || "$PY" -m pip install -q --break-system-packages $PIP_PKGS
if [ "$(readlink -f "$(command -v python3)")" != "$PY" ]; then mkdir -p "$SHIM_DIR" && ln -sf "$PY" "$SHIM_DIR/python3" && hash -r; fi
M=/root/models/sherpa-onnx-whisper-turbo
if [ ! -s "$M/turbo-encoder.int8.onnx" ]; then
  mkdir -p /root/models
  # resumable + retried: a fresh session saw the 564 MB download cut at 370 MB (24 Nov smoke test)
  URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2
  for i in 1 2 3 4 5; do curl -sL --retry 5 --retry-delay 5 --retry-all-errors -C - --max-time 900 -o /tmp/wt.tar.bz2 "$URL" && bzip2 -tq /tmp/wt.tar.bz2 && break; echo "model download attempt $i incomplete, resuming" >&2; sleep 5; done
  tar -xjf /tmp/wt.tar.bz2 -C /root/models sherpa-onnx-whisper-turbo/turbo-encoder.int8.onnx sherpa-onnx-whisper-turbo/turbo-decoder.int8.onnx sherpa-onnx-whisper-turbo/turbo-tokens.txt
  rm -f /tmp/wt.tar.bz2
fi
[ -d node_modules/playwright ] || npm i --no-save --silent playwright@1.63.0
ok=1
for c in node python3 ffmpeg ffprobe 7z; do command -v $c >/dev/null && echo "ok $c" || { echo "MISSING $c"; ok=0; }; done
# the checks use the SAME interpreter that was installed into, and prove that a fresh shell's "python3" is that interpreter
P3=$(bash -c 'readlink -f "$(command -v python3)"')
[ "$P3" = "$PY" ] && echo "ok python3 -> $PY" || { echo "MISSING python3 -> $PY (a new shell resolves python3 to $P3; put $SHIM_DIR first in PATH)"; ok=0; }
"$PY" -m pip --version | sed 's/^/ok pip: /' || ok=0
"$PY" -c "import sys, numpy, scipy, sherpa_onnx; print('ok python', sys.version.split()[0], 'numpy', numpy.__version__, 'scipy', scipy.__version__, 'sherpa', sherpa_onnx.__version__)" || { echo "MISSING numpy/scipy/sherpa_onnx in $PY"; ok=0; }
bash -c 'python3 -c "import numpy, scipy, sherpa_onnx"' && echo "ok python3 (new shell) imports numpy/scipy/sherpa_onnx" || { echo "MISSING imports via python3 in a new shell"; ok=0; }
[ -s "$M/turbo-encoder.int8.onnx" ] && echo "ok whisper model $M" || { echo "MISSING whisper model"; ok=0; }
node -e "require('playwright'); console.log('ok playwright')" || ok=0
[ $ok = 1 ]
