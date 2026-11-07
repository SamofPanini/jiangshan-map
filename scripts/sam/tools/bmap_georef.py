#!/usr/bin/env python3
import argparse, collections, hashlib, itertools, json, math, statistics, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
VAR=str.maketrans('双岡舖舗営県呉庙関','雙崗鋪鋪營縣吳廟關')
ALIASES={'通許縣':'通許','尉氏縣':'尉氏','新安集':'新安'}
RULINGS={'三劉砦':['三劉砦'], '關家橋':['關家橋','関家橋','閻家橋'], '蒲灘':['蒲灘','浦灘'], '岳店':['岳店','丘店'], '底閣':['底閣','関底'], '遜母口':['遜母口'], '趙崗砦':['趙崗砦','趙崗[巷?]','趙南[砦?]'], '大雙溝':['大雙溝','大双溝','大[夏?]溝'], '錢店':['錢店','[古?]錢'], '通許':['通許','許通'], '陳州':['陳州（淮陽）','陳州']}
def norm(s):
 s=s.translate(VAR); return ALIASES.get(s,s)
def fit(points,kind='affine',loo=False):
 p=subprocess.run(['node',str(ROOT/'scripts/sam/tools/bmap_georef.js')],input=json.dumps({'kind':kind,'points':points,'loo':loo}),text=True,capture_output=True,check=True)
 return json.loads(p.stdout)
def apply(t,x,y):
 terms=[1,x,y] + ([x*x,x*y,y*y] if t['kind']=='poly2' else [])
 return {'lon':sum(a*b for a,b in zip(t['lon'],terms)), 'lat':sum(a*b for a,b in zip(t['lat'],terms))}
def refine(im,x,y):
 # Difference of circular interior and ring means; all-black windows fail contrast.
 pix=im.load(); w,h=im.size; best=None
 offsets={r:([(dx,dy) for dx in range(-r+2,r-1) for dy in range(-r+2,r-1) if dx*dx+dy*dy <= (r-3)**2],[(dx,dy) for dx in range(-r-1,r+2) for dy in range(-r-1,r+2) if (r-1)**2 <= dx*dx+dy*dy <= (r+1)**2]) for r in range(7,11)}
 original_x,original_y=x,y
 x,y=round(x),round(y)
 for cx in range(max(11,x-14),min(w-11,x+15)):
  for cy in range(max(11,y-14),min(h-11,y+15)):
   for r,(inside,ring) in offsets.items():
    score=sum(pix[cx+dx,cy+dy] for dx,dy in inside)/len(inside)-sum(pix[cx+dx,cy+dy] for dx,dy in ring)/len(ring)
    if best is None or score>best[0]: best=(score,cx,cy,r)
 if best is None: return {'refine_failed':True,'score':None,'displacement':None}
 score,cx,cy,r=best; dist=math.hypot(cx-original_x,cy-original_y); failed=score<10 or dist>5 or abs(cx-x)==14 or abs(cy-y)==14
 return {'refine_failed':failed,'score':round(score,3),'displacement':round(dist,3),'proposed':[cx,cy],'radius':r}
def cluster(items):
 # Connected components of the <=10 px relation, rejecting reader collisions.
 n=len(items); parent=list(range(n))
 def root(i):
  while parent[i]!=i:
   parent[i]=parent[parent[i]]; i=parent[i]
  return i
 for i in range(n):
  for j in range(i):
   if items[i][0]!=items[j][0] and math.hypot(items[i][1]['x']-items[j][1]['x'],items[i][1]['y']-items[j][1]['y'])<=10: parent[root(i)]=root(j)
 groups={}
 for i,item in enumerate(items): groups.setdefault(root(i),[]).append(item)
 for g in groups.values():
  if len({r for r,p in g})!=len(g): raise ValueError('ambiguous spatial cluster: same reader repeated')
 return list(groups.values())
def page_groups(reads,page,im):
 out=[]
 items=[(r,p) for r in 'tab' for p in reads[r]['places']]
 for g in cluster(items):
  names=[p['name'] for _,p in g]; counts=collections.Counter(names); most=counts.most_common(); name=most[0][0]
  rulings=[k for k,v in RULINGS.items() if any(n in v for n in names)]
  if len(rulings)>1: raise ValueError('ambiguous adjudication')
  if rulings: name=rulings[0]
  elif len(most)>1 and most[0][1]==most[1][1]: name=names[0]
  x=sum(p['x'] for _,p in g)/len(g); y=sum(p['y'] for _,p in g)/len(g)
  circle=all(p['symbol']=='小円' for _,p in g)
  q={'page':page,'name':name,'readings':{r:p for r,p in g},'x':x,'y':y,'single_reader':len(g)==1,'name_disputed':len(set(names))>1,'non_circle':not circle}
  if circle:
   q.update(refine(im,x,y))
   if not q['refine_failed']: q['x'],q['y']=q['proposed']
  out.append(q)
 return out
def eligible(p): return not (p['single_reader'] or p['name_disputed'] or p['non_circle'] or p.get('refine_failed',False))
def connect(pages):
 pairs={}
 for a,b in itertools.combinations(sorted(pages),2):
  aa=collections.defaultdict(list); bb=collections.defaultdict(list)
  for p in pages[a]:
   if eligible(p): aa[norm(p['name'])].append(p)
  for p in pages[b]:
   if eligible(p): bb[norm(p['name'])].append(p)
  pairs[(a,b)]=[(aa[n][0],bb[n][0]) for n in sorted(aa.keys() & bb.keys()) if len(aa[n])==len(bb[n])==1]
 base=max(sorted(pages),key=lambda p:sum(len(v) for k,v in pairs.items() if p in k))
 transforms={base:{'kind':'affine','lon':[0,1,0],'lat':[0,0,1]}}; paths={base:[]}
 while True:
  choices=[]
  for (a,b),ps in pairs.items():
   if len(ps)>=3 and ((a in transforms) != (b in transforms)): choices.append((len(ps),a,b,ps))
  if not choices: break
  _,a,b,ps=sorted(choices,key=lambda x:(-x[0],x[1],x[2]))[0]; src,dst=(b,a) if a in transforms else (a,b)
  points=[]
  for pa,pb in ps:
   p,q=(pb,pa) if src==b else (pa,pb); xy=apply(transforms[dst],q['x'],q['y']); points.append({'x':p['x'],'y':p['y'],'lon':xy['lon'],'lat':xy['lat']})
  try: transforms[src]=fit(points)['transform']; paths[src]=paths[dst]+[dst]
  except subprocess.CalledProcessError: break
 return base,transforms,paths,pairs

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--reads',required=True); ap.add_argument('--images',required=True); ap.add_argument('--gazetteer',required=True); ap.add_argument('--output',required=True); args=ap.parse_args()
 paths=[]; pages={}; marks=[]
 for n in range(5,13):
  page=f'p{n:02}'; reads={}
  for r in 'tab':
   path=Path(args.reads)/f'{page}_{r}.json'; raw=path.read_bytes(); d=json.loads(raw); print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} places={len(d["places"])} dates={len(d["date_marks"])}',flush=True); reads[r]=d
  path=Path(args.images)/f'{page}.jpg'; raw=path.read_bytes(); print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} images=1',flush=True)
  with Image.open(path) as im:
   if im.size!=(2400,1697): raise ValueError('unexpected image dimensions')
   pages[page]=page_groups(reads,page,im.convert('L'))
  entries=[]
  for r in 'tab':
   for p in reads[r]['date_marks']:
    entries.append((r,dict(p,x=p['text_x'],y=p['text_y'])))
  for g in cluster(entries):
   tips=[(p['tip_x'],p['tip_y']) for _,p in g if p['tip_x'] is not None and p['tip_y'] is not None]
   marks.append({'page':page,'kind':'date','x':sum(p['x'] for _,p in g)/len(g),'y':sum(p['y'] for _,p in g)/len(g),'readings':{r:p for r,p in g},'tip_unstable':any(math.dist(a,b)>50 for a,b in itertools.combinations(tips,2))})
 path=Path(args.gazetteer); raw=path.read_bytes(); gaz=json.loads(raw); print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} records={len(gaz)}',flush=True)
 base,transforms,paths,pairs=connect(pages); found=collections.defaultdict(list)
 for g in gaz:
  if g['status']=='FOUND': found[norm(g['name_on_map'])].append(g)
 controls=[]; seen=set()
 for page in sorted(transforms):
  for p in pages[page]:
   name=norm(p['name']); matches=found[name]
   if eligible(p) and len(matches)==1 and name not in seen:
    xy=apply(transforms[page],p['x'],p['y']); g=matches[0]; controls.append({'id':page+':'+name,'name':name,'page':page,'x':xy['lon'],'y':xy['lat'],'local_x':p['x'],'local_y':p['y'],'lon':g['lon'],'lat':g['lat']}); seen.add(name)
 if len(controls)<7: raise RuntimeError(f'only {len(controls)} control points; cannot compare affine and poly2 with LOO; pages={sorted(transforms)} base={base}')
 results={k:fit(controls,k,True) for k in ('affine','poly2')}
 if any(any(x['meters'] is None for x in v['loo']) for v in results.values()): raise RuntimeError('LOO unavailable for one or more controls')
 recommended=min(results,key=lambda k: statistics.median(x['meters'] for x in results[k]['loo'])); result=results[recommended]; loo=sorted(x['meters'] for x in result['loo']); err={'loo_median_m':statistics.median(loo),'loo_max_m':max(loo)}
 candidates=[]
 for page,ps in pages.items():
  for p in ps:
   if not p['non_circle'] and not found[norm(p['name'])]: candidates.append(dict(p,kind='place'))
 candidates+=marks
 for p in candidates:
  if p['page'] in transforms:
   xy=apply(transforms[p['page']],p['x'],p['y']); p['wgs84']=apply(result['transform'],xy['lon'],xy['lat']); p['error_reference']=err
  else: p['wgs84']=None; p['unavailable']='page unconnected'
 out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
 def write(name,obj): (out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
 write('candidates.json',{'recommended':recommended,'base':base,'candidates':candidates})
 pairdata=[]
 for (a,b),ps in pairs.items():
  ds=[]
  if a in transforms and b in transforms:
   for p,q in ps:
    x=apply(transforms[a],p['x'],p['y']); y=apply(transforms[b],q['x'],q['y']); ds.append(math.hypot(x['lon']-y['lon'],x['lat']-y['lat']))
  pairdata.append({'pages':[a,b],'names':[p['name'] for p,q in ps],'count':len(ps),'rms_px':math.sqrt(sum(x*x for x in ds)/len(ds)) if ds else None})
 write('analysis.json',{'base':base,'pages':pages,'transforms':transforms,'paths':paths,'pairs':pairdata,'controls':controls,'results':results,'recommended':recommended})
 top=sorted(result['loo'],key=lambda q:q['meters'],reverse=True)[:5]; crops=[]
 for page,ps in pages.items():
  for p in ps:
   if p['name_disputed'] or p.get('refine_failed'): crops.append({'page':page,'name':p['name'],'x':p['x'],'y':p['y'],'name_disputed':p['name_disputed'],'refine_failed':p.get('refine_failed',False)})
 for c in top:
  orig=next(p for p in controls if p['id']==c['id']); crops.append({'page':orig['page'],'name':orig['name'],'x':orig['local_x'],'y':orig['local_y'],'loo_top5_m':c['meters']})
 write('crops_index.json',crops)
 draw_outputs(out,pages,transforms,pairs,controls,result)
 print(f'DONE base={base} connected={len(transforms)} controls={len(controls)} recommended={recommended} candidates={len(candidates)}',flush=True)

def draw_outputs(out,pages,transforms,pairs,controls,result):
 # Scatter plots are diagrams only; no source image is embedded.
 im=Image.new('RGB',(1200,900),'white'); d=ImageDraw.Draw(im); d.text((20,15),'Page layout: connected pages in base coordinates; unconnected below',fill='black')
 allxy=[]
 for page,t in transforms.items():
  xy=[apply(t,x,y) for x,y in [(0,0),(2400,0),(2400,1697),(0,1697)]]; allxy.extend((v['lon'],v['lat']) for v in xy)
 minx=min(x for x,y in allxy); miny=min(y for x,y in allxy); scale=min(1100/(max(x for x,y in allxy)-minx),650/(max(y for x,y in allxy)-miny))
 def pos(x,y): return (40+(x-minx)*scale,50+(y-miny)*scale)
 for page,t in transforms.items():
  pts=[pos(v['lon'],v['lat']) for v in [apply(t,x,y) for x,y in [(0,0),(2400,0),(2400,1697),(0,1697)]]]; d.line(pts+[pts[0]],fill='blue',width=2); d.text(pts[0],page,fill='black')
 for (a,b),ps in pairs.items():
  if a in transforms and b in transforms:
   for p,q in ps:
    v=apply(transforms[a],p['x'],p['y']); x,y=pos(v['lon'],v['lat']); d.ellipse((x-2,y-2,x+2,y+2),fill='red')
 for i,page in enumerate(sorted(set(pages)-set(transforms))):
  x=25+i*230; d.rectangle((x,740,x+200,850),outline='gray',width=2); d.text((x+8,750),page+' UNCONNECTED',fill='black')
 im.save(out/'layout.png')
 im=Image.new('RGB',(1200,900),'white'); d=ImageDraw.Draw(im); d.text((20,15),'Residual vectors: 1 degree = 1000 px (same scale as points)',fill='black')
 vals=[(p['lon'],p['lat']) for p in controls]+[(r['predicted']['lon'],r['predicted']['lat']) for r in result['residuals']]; minlon=min(x for x,y in vals); maxlat=max(y for x,y in vals)
 for p,r in zip(controls,result['residuals']):
  x=50+(p['lon']-minlon)*1000; y=60+(maxlat-p['lat'])*1000; xx=50+(r['predicted']['lon']-minlon)*1000; yy=60+(maxlat-r['predicted']['lat'])*1000; d.line((x,y,xx,yy),fill='red',width=2); d.ellipse((x-3,y-3,x+3,y+3),fill='blue'); angle=math.atan2(yy-y,xx-x); d.line((xx-8*math.cos(angle-0.5),yy-8*math.sin(angle-0.5),xx,yy,xx-8*math.cos(angle+0.5),yy-8*math.sin(angle+0.5)),fill='red',width=2)
 im.save(out/'residuals.png')
if __name__=='__main__': main()
