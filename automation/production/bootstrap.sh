#!/bin/bash
# Whyscape: tools a FRESH cloud session needs for /eksekusizip intake and unattended production (render, audio, Whisper, RAR/7z).
# Run by the session itself as its first step (no environment setup script needed):  bash automation/production/bootstrap.sh
# Idempotent; prints one line per tool; exit ≠ 0 if anything required is missing afterwards.
set -e
export DEBIAN_FRONTEND=noninteractive
cd "$(dirname "$0")/../.."
command -v 7z >/dev/null && command -v unrar-free >/dev/null || { apt-get install -y -qq unrar-free p7zip-full >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq unrar-free p7zip-full >/dev/null; }; }
python3 -c "import numpy, scipy, sherpa_onnx" 2>/dev/null || pip install -q numpy==2.5.3 scipy==1.18.1 sherpa-onnx==2.0.2
M=/root/models/sherpa-onnx-whisper-turbo
if [ ! -s "$M/turbo-encoder.int8.onnx" ]; then
  mkdir -p /root/models
  curl -sL --max-time 900 -o /tmp/wt.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2
  tar -xjf /tmp/wt.tar.bz2 -C /root/models sherpa-onnx-whisper-turbo/turbo-encoder.int8.onnx sherpa-onnx-whisper-turbo/turbo-decoder.int8.onnx sherpa-onnx-whisper-turbo/turbo-tokens.txt
  rm -f /tmp/wt.tar.bz2
fi
[ -d node_modules/playwright ] || npm i --no-save --silent playwright@1.63.0
ok=1
for c in node python3 ffmpeg ffprobe 7z; do command -v $c >/dev/null && echo "ok $c" || { echo "MISSING $c"; ok=0; }; done
python3 -c "import numpy, scipy, sherpa_onnx; print('ok python numpy', numpy.__version__, 'scipy', scipy.__version__, 'sherpa', sherpa_onnx.__version__)" || ok=0
[ -s "$M/turbo-encoder.int8.onnx" ] && echo "ok whisper model $M" || { echo "MISSING whisper model"; ok=0; }
node -e "require('playwright'); console.log('ok playwright')" || ok=0
[ $ok = 1 ]
