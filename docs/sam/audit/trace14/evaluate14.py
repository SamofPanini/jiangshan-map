#!/usr/bin/env python3
"""Per-job: status, n vertices, pairwise distances, overlay png per job. Fail-closed on missing arm files."""
import json, math, sys
from PIL import Image, ImageDraw
J = json.load(open('jobs.json')); ARMS = ['t1', 't2', 's1']
def seg_dist(p, v):
    best = 1e9
    for (a, b), (c, d) in zip(v, v[1:]):
        L = (c-a)**2 + (d-b)**2; t = 0 if L == 0 else max(0, min(1, ((p[0]-a)*(c-a) + (p[1]-b)*(d-b)) / L))
        best = min(best, math.hypot(p[0]-a-t*(c-a), p[1]-b-t*(d-b)))
    return best
for j in J:
    L = {}
    for a in ARMS:
        o = json.load(open(f"out/{j['id']}{a}-final.md", encoding='utf-8'))
        ln = o['lines'][0] if o['lines'] else None
        L[a] = ln
        print(j['id'], a, 'lines', len(o['lines']), ln and ln['status'], ln and ln['confidence'], ln and len(ln['vertices']), ln and (ln['start_note'][:50], ln['end_note'][:50]))
    for x in ARMS:
        for y in ARMS:
            if x >= y or not L[x] or not L[y] or len(L[x]['vertices']) < 2 or len(L[y]['vertices']) < 2: continue
            d = sorted(seg_dist(p, L[y]['vertices']) for p in L[x]['vertices'])
            print(f"   {x}-{y}: med {d[len(d)//2]:.0f} p90 {d[int(len(d)*.9)]:.0f} max {d[-1]:.0f}")
    im = Image.open(f"crops/{j['id']}.jpg").convert('RGB'); dr = ImageDraw.Draw(im)
    for a, col in zip(ARMS, [(230,30,30),(30,160,30),(30,60,230)]):
        if L[a] and len(L[a]['vertices']) > 1:
            dr.line([(x-j['x0'], y-j['y0']) for x, y in L[a]['vertices']], fill=col, width=3)
    dr.ellipse((j['lx']-j['x0']-12, j['ly']-j['y0']-12, j['lx']-j['x0']+12, j['ly']-j['y0']+12), outline=(250,150,0), width=3)
    im.save(f"out/{j['id']}_overlay.jpg", quality=85)
