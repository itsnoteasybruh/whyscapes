#!/usr/bin/env bash
# contact sheet of stills: tools/contact.sh <out.png> <cols> <png…>  (each frame 270×480, label = file name time)
out=$1; cols=$2; shift 2; n=$#; rows=$(( (n + cols - 1) / cols ))
args=(); i=0; f=""
for p in "$@"; do args+=(-i "$p"); lab=$(basename "$p" .png | sed 's/still_//'); f+="[$i:v]scale=270:480,drawtext=text='$lab':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6[v$i];"; i=$((i+1)); done
for ((k=n;k<rows*cols;k++)); do args+=(-f lavfi -i color=c=gray:s=270x480:d=1); f+="[$k:v]null[v$k];"; done
ins=""; for ((k=0;k<rows*cols;k++)); do ins+="[v$k]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${f}${ins}xstack=inputs=$((rows*cols)):layout=$(python3 -c "print('|'.join(f'{(k%$cols)*270}_{(k//$cols)*480}' for k in range($rows*$cols)))")" -frames:v 1 "$out"
