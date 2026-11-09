#!/usr/bin/env python3
"""Evaluate trace arms: overlay on crop, on-ink fraction, inter-arm distance. Reads named arm files only; fail-closed."""
import json, math, sys
from PIL import Image, ImageDraw
W = '/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/files/pages/D5/p06.jpg'
X0, Y0, X1, Y1 = 450, 480, 1350, 1697
arms = sys.argv[1:]
if not arms: sys.exit('name arms')
page = Image.open(W).convert('L'); assert page.size == (2400, 1697)
px = page.load()
def on_ink(x, y, r=3, thr=110):
    return any(0 <= x+dx < 2400 and 0 <= y+dy < 1697 and px[x+dx, y+dy] < thr for dx in range(-r, r+1) for dy in range(-r, r+1))
def samples(v, step=3):
    for (a, b), (c, d) in zip(v, v[1:]):
        n = max(1, int(math.hypot(c-a, d-b) / step))
        for i in range(n): yield (round(a + (c-a)*i/n), round(b + (d-b)*i/n))
def seg_dist(p, v):
    best = 1e9
    for (a, b), (c, d) in zip(v, v[1:]):
        L = (c-a)**2 + (d-b)**2; t = 0 if L == 0 else max(0, min(1, ((p[0]-a)*(c-a) + (p[1]-b)*(d-b)) / L))
        best = min(best, math.hypot(p[0]-a-t*(c-a), p[1]-b-t*(d-b)))
    return best
data = {}
for a in arms:
    j = json.load(open(f'out/{a}-final.md', encoding='utf-8'))
    print(f'READ {a}: image_seen={j["image_seen"]} lines={len(j["lines"])} doubt={j["missing_or_doubt"][:80]!r}')
    data[a] = j
    for i, l in enumerate(j['lines']):
        v = l['vertices']; s = list(samples(v)) if len(v) > 1 else []
        ink = sum(on_ink(*p) for p in s) / len(s) if s else float('nan')
        out = sum(1 for x, y in v if not (X0 <= x <= X1 and Y0 <= y <= Y1))
        print(f'  {a}#{i} label={l["label"]}@({l["label_x"]},{l["label_y"]}) status={l["status"]} conf={l["confidence"]} n={len(v)} '
              f'ink={ink:.2f} out_of_crop={out} first={v[:1]} last={v[-1:]} style={l["line_style_seen"][:30]!r}')
        print(f'     start={l["start_note"][:70]!r} end={l["end_note"][:70]!r} note={l["note"][:90]!r}')
# inter-arm: match lines by nearest label
for a in arms:
    for b in arms:
        if a >= b: continue
        for i, la in enumerate(data[a]['lines']):
            if len(la['vertices']) < 2: continue
            lb = min((l for l in data[b]['lines'] if len(l['vertices']) > 1), key=lambda l: math.hypot(l['label_x']-la['label_x'], l['label_y']-la['label_y']), default=None)
            if lb is None: continue
            d = sorted(seg_dist(p, lb['vertices']) for p in la['vertices'])
            print(f'  {a}#{i} vs {b}: median {d[len(d)//2]:.0f}px p90 {d[int(len(d)*0.9)]:.0f}px max {d[-1]:.0f}px')
im = Image.open(W).convert('RGB').crop((X0, Y0, X1, Y1)); dr = ImageDraw.Draw(im)
col = {0: (230, 30, 30), 1: (30, 160, 30), 2: (30, 60, 230)}
for k, a in enumerate(arms):
    for l in data[a]['lines']:
        v = [(x-X0, y-Y0) for x, y in l['vertices']]
        if len(v) > 1: dr.line(v, fill=col[k % 3], width=3)
        for x, y in v: dr.ellipse((x-3, y-3, x+3, y+3), outline=col[k % 3])
im.save('out/overlay.png'); print('overlay out/overlay.png colors red/green/blue =', arms)
