#!/usr/bin/env python3
import argparse, collections, hashlib, itertools, json, math, re, statistics, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
VAR=str.maketrans('双岡舖舗営県呉庙関銭独遥','雙崗鋪鋪營縣吳廟關錢獨遙')
ALIASES={'通許縣':'通許','尉氏縣':'尉氏','新安集':'新安','中牟縣':'中牟'}
# Only rulings actually identified on the designated pages; remaining readings stay literal.
RULINGS={
 'p05':{'岳店':'岳店'},
 'p06':{'三劉砦':'三劉砦','閻家橋':'關家橋','關家橋':'關家橋','蒲灘':'蒲灘','浦灘':'蒲灘','岳店':'岳店','丘店':'岳店'},
 'p07':{'底閣':'底閣','大雙溝':'大雙溝','許通':'通許','通許':'通許','趙尚[営?]':'趙崗砦','趙岡□':'趙崗砦','趙岡[砦?]':'趙崗砦','遥丹口':'遜母口'},
 'p08':{'関底':'底閣','遜母口':'遜母口','趙崗[巷?]':'趙崗砦','趙南[砦?]':'趙崗砦','大双溝':'大雙溝','大雙溝':'大雙溝','許通':'通許','通許':'通許'},
 'p09':{'陳州（淮陽）':'陳州','[錢?]□':'錢店'},
 'p11':{'[古?]錢':'錢店'},
}
def norm(s):
 s=re.sub(r'\[([^\[\]?])\?\]',r'\1',s).translate(VAR)
 return ALIASES.get(s,s)
def choose_name(page,readings):
 names=[p['name'] for p in readings.values()]; normalized=[norm(n) for n in names]; counts=collections.Counter(normalized)
 rulings={RULINGS.get(page,{}).get(n) for n in names}-{None}
 if len(rulings)>1: raise ValueError('ambiguous adjudication')
 if rulings: name=next(iter(rulings)); source='adjudicated'; disputed=False
 else:
  most=counts.most_common(); majority=most[0][1]>=2
  if majority:
   agreeing=[n for n in names if norm(n)==most[0][0]]; raw_counts=collections.Counter(agreeing); name=max(agreeing,key=lambda n:(raw_counts[n], n==readings.get('t',{}).get('name'))); source='unanimous' if len(readings)==3 and len(counts)==1 else 'majority'; disputed=False
  else: name=readings.get('t',next(iter(readings.values())))['name']; source='no_majority'; disputed=len(readings)>1
 return {'name':name,'name_source':source,'name_disputed':disputed,'name_uncertain':bool(re.search(r'\[[^\]]+\?\]|□|読めない',name)), 'normalized_unanimous':len(readings)==3 and len(counts)==1}
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
 for g in cluster([(r,p) for r in 'tab' for p in reads[r]['places']]):
  readings={r:p for r,p in g}; x=statistics.mean(p['x'] for _,p in g); y=statistics.mean(p['y'] for _,p in g)
  circle=all(p['symbol']=='小円' for _,p in g)
  q={'page':page,'readings':readings,'x':x,'y':y,'mean_x':x,'mean_y':y,'single_reader':len(g)==1,'non_circle':not circle,**choose_name(page,readings)}
  if circle:
   q.update(refine(im,x,y))
   if not q['refine_failed']: q['x'],q['y']=q['proposed']
  q['unrefined_tie']=bool(q.get('refine_failed') and len(g)==3 and all(math.hypot(p['x']-v['x'],p['y']-v['y'])<=5 for (_,p),(_,v) in itertools.combinations(g,2)))
  out.append(q)
 return out
def eligible(p):
 return not (p['single_reader'] or p['name_disputed'] or p['name']=='読めない' or (p.get('refine_failed',False) and not p.get('unrefined_tie',False)))
def gcp_eligible(p):
 square=p['name']=='開封' and all(q['symbol']=='四角' for q in p['readings'].values())
 return (norm(p['name'])!='新蔡' and len(p['readings'])==3 and not p['name_uncertain'] and not p['name_disputed'] and not p.get('refine_failed',False) and (p['name_source']=='adjudicated' or p['normalized_unanimous']) and (not p['non_circle'] or square))
def connect(pages, excluded=frozenset(), base=None):
 pairs={}; duplicates={}
 for page,ps in pages.items():
  allnames=collections.Counter(norm(p['name']) for p in ps)
  duplicates[page]=sorted(n for n,c in allnames.items() if c>1)
 for a,b in itertools.combinations(sorted(pages),2):
  aa={norm(p['name']):p for p in pages[a] if eligible(p) and norm(p['name']) not in duplicates[a]}; bb={norm(p['name']):p for p in pages[b] if eligible(p) and norm(p['name']) not in duplicates[b]}
  pairs[a,b]=[(aa[n],bb[n]) for n in sorted(aa.keys() & bb.keys()) if (a,b,n) not in excluded]
 if base is None: base=max(sorted(pages),key=lambda p:sum(len(v) for k,v in pairs.items() if p in k))
 # A page may be constrained jointly through several other pages even when
 # no single page pair supplies three ties. Prune pages with fewer than three
 # distinct local tie locations, then keep the base-connected component.
 remaining=set(pages)
 while True:
  to_remove=[]
  for page in sorted(remaining-{base}):
   loc=set()
   for (a,b),ps in pairs.items():
    if a in remaining and b in remaining and page in (a,b):
     for p,q in ps:
      z=p if page==a else q;loc.add((z['x'],z['y']))
   if len(loc)<3:to_remove.append(page)
  if not to_remove:break
  remaining.difference_update(to_remove)
 connected={base}
 while True:
  extra={q for (a,b),ps in pairs.items() if ps and a in remaining and b in remaining for q in (a,b) if (a in connected or b in connected)}
  if extra<=connected:break
  connected.update(extra)
 transforms={page:{'kind':'affine','lon':[0,1,0],'lat':[0,0,1]} for page in sorted(connected)};paths={page:[] for page in connected}

 return base,transforms,paths,pairs

def simultaneous(base,transforms,pairs):
 # Solve a joint least-squares affine network, base fixed. Normal equations with
 # pivoting, scaling coordinates to thousands of pixels to reduce conditioning.
 pages=sorted(set(transforms)-{base}); ids={p:3*i for i,p in enumerate(pages)}; n=len(pages)*3
 if not n:return transforms
 mat=[[0.0]*n for _ in range(n)]; rhs=[[0.0]*n for _ in range(2)]
 for (a,b),ps in pairs.items():
  if a not in transforms or b not in transforms:continue
  for p,q in ps:
   row=[0.0]*n; target=[0.0,0.0]
   for page,z,sign in ((a,p,1),(b,q,-1)):
    if page==base: target[0]-=sign*z['x']; target[1]-=sign*z['y']
    else:
     j=ids[page];row[j]+=sign;row[j+1]+=sign*z['x']/1000;row[j+2]+=sign*z['y']/1000
   active=[i for i,v in enumerate(row) if v]
   for i in active:
    for j in active:mat[i][j]+=row[i]*row[j]
    for k in range(2):rhs[k][i]+=row[i]*target[k]
 aug=[mat[i]+[rhs[0][i],rhs[1][i]] for i in range(n)]
 for col in range(n):
  pivot=max(range(col,n),key=lambda i:abs(aug[i][col]));
  if abs(aug[pivot][col])<1e-10: raise ValueError('joint affine network is rank deficient')
  aug[col],aug[pivot]=aug[pivot],aug[col]; div=aug[col][col];aug[col]=[v/div for v in aug[col]]
  for i in range(n):
   if i!=col:
    z=aug[i][col];aug[i]=[x-z*y for x,y in zip(aug[i],aug[col])]
 out={base:transforms[base]}
 for page,j in ids.items():out[page]={'kind':'affine','lon':[aug[j][n],aug[j+1][n]/1000,aug[j+2][n]/1000],'lat':[aug[j][n+1],aug[j+1][n+1]/1000,aug[j+2][n+1]/1000]}
 return out

def pair_residuals(transforms,pairs):
 rows=[]
 for (a,b),ps in pairs.items():
  for p,q in ps:
   distance=None
   if a in transforms and b in transforms:
    x=apply(transforms[a],p['x'],p['y']);y=apply(transforms[b],q['x'],q['y']);distance=math.hypot(x['lon']-y['lon'],x['lat']-y['lat'])
   rows.append({'a':a,'b':b,'name':norm(p['name']),'residual_px':distance,'a_xy':[p['x'],p['y']],'b_xy':[q['x'],q['y']]})
 return rows

def analyze_variant(base, transforms, pairs, pages, found):
 rows=pair_residuals(transforms,pairs); controls=[]
 for page in sorted(transforms):
  for p in pages[page]:
   name=norm(p['name']); matches=found.get(name,[])
   if gcp_eligible(p) and len(matches)==1:
    xy=apply(transforms[page],p['x'],p['y']); g=matches[0]; controls.append({'id':page+':'+name,'name':name,'page':page,'x':xy['lon'],'y':xy['lat'],'local_x':p['x'],'local_y':p['y'],'lon':g['lon'],'lat':g['lat'],'unrefined_gcp':p['non_circle'] and name=='開封'})
 if len({p['id'] for p in controls})!=len(controls): raise ValueError('duplicate GCP on page')
 if len(controls)<7: raise ValueError(f'insufficient control points: {len(controls)}')
 results={k:fit(controls,k,True) for k in ('affine','poly2')}
 if any(any(z['meters'] is None for z in v['loo']) for v in results.values()): raise ValueError('LOO unavailable')
 selected=min(results,key=lambda k:statistics.median(z['meters'] for z in results[k]['loo']))
 per_page={}
 for page in sorted(transforms):
  points=[p for p in controls if p['page']==page]; indices=[i for i,p in enumerate(controls) if p['page']==page]
  entry={'count':len(points),'global_loo_median_m':statistics.median(results[selected]['loo'][i]['meters'] for i in indices) if indices else None}
  if len(points)>=4:
   try:
    local=fit(points,'affine',True);entry['local_affine_loo_median_m']=statistics.median(q['meters'] for q in local['loo']) if all(q['meters'] is not None for q in local['loo']) else None;entry['local_affine_loo']=local['loo']
   except subprocess.CalledProcessError as e:entry['local_error']=e.stderr.strip()
  per_page[page]=entry
 return {'transforms':transforms,'ties':rows,'controls':controls,'results':results,'recommended_transform':selected,'per_page':per_page}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--reads',required=True);ap.add_argument('--images',required=True);ap.add_argument('--gazetteer',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
 pages={};marks=[]
 for n in range(5,13):
  page=f'p{n:02}';reads={}
  for r in 'tab':
   path=Path(args.reads)/f'{page}_{r}.json';raw=path.read_bytes();d=json.loads(raw);print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} places={len(d["places"])} dates={len(d["date_marks"])}',flush=True);reads[r]=d
  path=Path(args.images)/f'{page}.jpg';raw=path.read_bytes();print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} images=1',flush=True)
  with Image.open(path) as im:
   if im.size!=(2400,1697):raise ValueError('unexpected image dimensions')
   pages[page]=page_groups(reads,page,im.convert('L'))
  entries=[(r,dict(p,x=p['text_x'],y=p['text_y'])) for r in 'tab' for p in reads[r]['date_marks']]
  for g in cluster(entries):
   tips=[(p['tip_x'],p['tip_y']) for _,p in g if p['tip_x'] is not None and p['tip_y'] is not None]
   marks.append({'page':page,'kind':'date','x':statistics.mean(p['x'] for _,p in g),'y':statistics.mean(p['y'] for _,p in g),'readings':{r:p for r,p in g},'tip_unstable':any(math.dist(a,b)>50 for a,b in itertools.combinations(tips,2))})
 path=Path(args.gazetteer);raw=path.read_bytes();gaz=json.loads(raw);print(f'INPUT {path} sha256={hashlib.sha256(raw).hexdigest()} records={len(gaz)}',flush=True)
 found=collections.defaultdict(list)
 for g in gaz:
  if g['status']=='FOUND':found[norm(g['name_on_map'])].append(g)
 base,initial,paths,pairs=connect(pages);full_transforms=simultaneous(base,initial,pairs);full=analyze_variant(base,full_transforms,pairs,pages,found)
 outliers=[z for z in full['ties'] if z['residual_px'] is not None and z['residual_px']>15]
 excluded={(z['a'],z['b'],z['name']) for z in outliers}
 _,initial2,paths2,pairs2=connect(pages,excluded,base);filtered_transforms=simultaneous(base,initial2,pairs2);filtered=analyze_variant(base,filtered_transforms,pairs2,pages,found)
 # Prefer the geometrically reviewed version when it preserves connectivity;
 # otherwise preserve coverage and make the loss explicit.
 chosen='filtered' if excluded and set(filtered_transforms)==set(full_transforms) else 'full'
 chosen_data={'full':full,'filtered':filtered}[chosen];transforms=chosen_data['transforms'];result=chosen_data['results'][chosen_data['recommended_transform']]; loo=[z['meters'] for z in result['loo']];err={'loo_median_m':statistics.median(loo),'loo_max_m':max(loo)}
 candidates=[dict(p,kind='place') for page,ps in pages.items() for p in ps if not p['non_circle'] and (not found.get(norm(p['name'])) or p['name_uncertain'] or p['name_disputed']) and page in transforms]+[m for m in marks if m['page'] in transforms]
 for p in candidates:
  xy=apply(transforms[p['page']],p['x'],p['y']);p['wgs84']=apply(result['transform'],xy['lon'],xy['lat']);p['error_reference']=err
 duplicates={page:sorted(n for n,c in collections.Counter(norm(p['name']) for p in ps).items() if c>1) for page,ps in pages.items()}
 analysis={'base':base,'pages':pages,'pairs_full_counts':{a+'-'+b:len(v) for (a,b),v in pairs.items()},'duplicates':duplicates,'outliers':outliers,'full':full,'filtered':filtered,'recommended_stitch':chosen,'paths_full':paths,'paths_filtered':paths2}
 out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 def write(name,obj):(out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
 write('analysis.json',analysis);write('candidates.json',{'recommended_stitch':chosen,'recommended_transform':chosen_data['recommended_transform'],'base':base,'candidates':candidates})
 top=sorted(result['loo'],key=lambda q:q['meters'],reverse=True)[:5]; crops=[]
 for page,ps in pages.items():
  for p in ps:
   if p['name_disputed'] or p.get('refine_failed'):crops.append({'page':page,'name':p['name'],'x':p['x'],'y':p['y'],'name_disputed':p['name_disputed'],'refine_failed':p.get('refine_failed',False)})
 for c in top:
  orig=next(p for p in chosen_data['controls'] if p['id']==c['id']);crops.append({'page':orig['page'],'name':orig['name'],'x':orig['local_x'],'y':orig['local_y'],'loo_top5_m':c['meters']})
 write('crops_index.json',crops)
 draw_outputs(out,pages,transforms,pairs if chosen=='full' else pairs2,chosen_data['controls'],result)
 print(f'DONE base={base} full_pages={len(full_transforms)} filtered_pages={len(filtered_transforms)} outliers={len(outliers)} recommended={chosen}/{chosen_data["recommended_transform"]} controls={len(chosen_data["controls"])} candidates={len(candidates)}',flush=True)

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
 im=Image.new('RGB',(1800,1300),'white'); d=ImageDraw.Draw(im)
 font=ImageFont.truetype('/System/Library/Fonts/PingFang.ttc',18)
 d.text((20,15),'Residual vectors 10x; numbered labels at right: name / page / LOO km',fill='black',font=font)
 vectors=[]
 for p,r,loo in zip(controls,result['residuals'],result['loo']):
  x,y=p['lon'],p['lat']; xx=x+10*(r['predicted']['lon']-x); yy=y+10*(r['predicted']['lat']-y); vectors.append((p,loo,x,y,xx,yy))
 xs=[v for _,_,x,y,xx,yy in vectors for v in (x,xx)];ys=[v for _,_,x,y,xx,yy in vectors for v in (y,yy)]
 scale=min(1030/(max(xs)-min(xs)),1050/(max(ys)-min(ys)))
 for i,(p,loo,x,y,xx,yy) in enumerate(vectors):
  x=80+(x-min(xs))*scale;y=80+(max(ys)-y)*scale;xx=80+(xx-min(xs))*scale;yy=80+(max(ys)-yy)*scale
  d.line((x,y,xx,yy),fill='red',width=2);d.ellipse((x-4,y-4,x+4,y+4),fill='blue');angle=math.atan2(yy-y,xx-x)
  d.line((xx-8*math.cos(angle-0.5),yy-8*math.sin(angle-0.5),xx,yy,xx-8*math.cos(angle+0.5),yy-8*math.sin(angle+0.5)),fill='red',width=2)
  label_x=1180;label_y=75+i*27
  d.text((x+5,y+5+(i%3)*14),str(i+1),fill='black',font=font)
  d.text((label_x,label_y),f"{i+1:02d}  {p['name']} {p['page']} {loo['meters']/1000:.1f} km",fill='black',font=font)
 im.save(out/'residuals.png')
if __name__=='__main__': main()
