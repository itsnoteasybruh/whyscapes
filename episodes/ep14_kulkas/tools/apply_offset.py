"""EP13: video-time transcript = VO-time alignment + VO_OFFSET (the VO plays behind the cover, uncut, 1.00x).
  python episodes/ep13_lebah_pulang/tools/apply_offset.py episodes/ep13_lebah_pulang 1.0
  in : transcript_aligned.json (VO time)  →  out: transcript.json (video time; segments/words shifted by the offset)
"""
import json, os, sys
EP, OFF = os.path.abspath(sys.argv[1]), float(sys.argv[2])
tr = json.load(open(os.path.join(EP, 'transcript_aligned.json'), encoding='utf-8'))
for s in tr['segments']:
    s['start'] = round(s['start'] + OFF, 3); s['end'] = round(s['end'] + OFF, 3)
    s['words'] = [[w, round(a + OFF, 3), round(b + OFF, 3)] for w, a, b in s.get('words', [])]
tr['voOffset'] = OFF
json.dump(tr, open(os.path.join(EP, 'transcript.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('transcript.json written, offset', OFF)
