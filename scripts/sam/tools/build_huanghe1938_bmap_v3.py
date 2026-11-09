#!/usr/bin/env python3
"""Build the P1-8 dataset from explicitly named inputs."""
import argparse, copy, hashlib, importlib.util, json, math, pathlib, statistics, subprocess, tempfile

spec = importlib.util.spec_from_file_location('v2', pathlib.Path(__file__).with_name('build_fronts_1938_bmap_v2.py'))
v2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v2)
GROUPS = {'g2': ('t1','t2','s1'), 'g6': ('t1','s1'), 'g1': ('s1',), 'g3': ('s1',), 'g5': ('s1',)}
MODES = {'g2':'reconstructed','g6':'reconstructed','g1':'hypothesis','g3':'hypothesis','g5':'hypothesis'}

def read(path):
    raw = pathlib.Path(path).read_bytes(); obj = json.loads(raw)
    print(f'input={path} sha256={hashlib.sha256(raw).hexdigest()} count={len(obj) if isinstance(obj,list) else len(obj.get("features", obj.get("candidates", obj.get("points", obj.get("lines", obj)))))}')
    return obj

def resample(points, step=20):
    lengths=[0.0]
    for a,b in zip(points,points[1:]): lengths.append(lengths[-1]+math.dist(a,b))
    if len(points)<2 or lengths[-1]==0: raise ValueError('empty or degenerate trace')
    targets=[i*step for i in range(int(lengths[-1]//step)+1)]
    if targets[-1] < lengths[-1]-1e-9: targets.append(lengths[-1])
    out=[]; j=0
    for t in targets:
        while j+1<len(lengths)-1 and lengths[j+1]<t: j+=1
        if lengths[j+1]==lengths[j]: raise ValueError('duplicate vertex')
        f=(t-lengths[j])/(lengths[j+1]-lengths[j]); out.append(tuple(points[j][k]+f*(points[j+1][k]-points[j][k]) for k in (0,1)))
    return out

def project(p,line):
    best=None
    for i,(a,b) in enumerate(zip(line,line[1:])):
        dx,dy=b[0]-a[0],b[1]-a[1]; den=dx*dx+dy*dy
        if not den: continue
        t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)); q=(a[0]+t*dx,a[1]+t*dy); d=math.dist(p,q)
        if best is None or d<best[0]: best=(d,i+t,q)
    return best

def align(lines):
    lines=[resample(p) for p in lines]
    if len(lines)==1: return lines[0],0.0,0.0,[]
    ref=lines[0]; aligned=[]; previous=[-1.0]*(len(lines)-1)
    for p in ref:
        matches=[project(p,line) for line in lines[1:]]
        # Reject extrapolation past either endpoint and reversed/nonmonotonic matches.
        valid=all(1e-9 < m[1] < len(line)-1-1e-9 and m[1]>=prev for m,line,prev in zip(matches,lines[1:],previous))
        if valid: previous=[m[1] for m in matches]
        pts=[p]+[m[2] for m in matches]; spread=max(math.dist(a,b) for i,a in enumerate(pts) for b in pts[i+1:]); avg=tuple(statistics.mean(q[k] for q in pts) for k in (0,1))
        aligned.append((avg,spread,valid,pts))
    runs=[]; run=[]; cut=0.0
    for i,row in enumerate(aligned):
        good=row[2] and row[1]<=40
        if good: run.append(row)
        elif run: runs.append(run); run=[]
        if i and (not good or not (aligned[i-1][2] and aligned[i-1][1]<=40)): cut+=math.dist(ref[i-1],ref[i])
    if run: runs.append(run)
    runs=[r for r in runs if len(r)>=2]
    if len(runs)!=1: raise ValueError(f'expected exactly one retained line, got {len(runs)}; adjudication required')
    chosen=runs[0]; return [r[0] for r in chosen],cut,max(r[1] for r in chosen),[r[3] for r in chosen]

def fit(gcps):
    pairs=[dict(x=p['mosaic_x'],y=p['mosaic_y'],lon=p['lon'],lat=p['lat'],name=p['name']) for p in gcps]
    js="const c=require('./tools/sam/georef/georef_core.js');let p=JSON.parse(require('fs').readFileSync(0,'utf8'));let q=c.fitPoly2(p),a=c.fitAffine(p),l=c.looResiduals('poly2',p).map(x=>x.meters);if(l.some(x=>!Number.isFinite(x)))throw Error('LOO');process.stdout.write(JSON.stringify({poly:q,affine:a,loo:Math.max(...l)}));"
    return json.loads(subprocess.run(['node','-e',js],input=json.dumps(pairs),text=True,capture_output=True,check=True).stdout)

def build(a):
    analysis=read(a.analysis); candidates=read(a.candidates)['candidates']; gcps=read(a.gcp); jobs={j['id']:j for j in read(a.jobs)}
    if gcps['points'] != v2.dedup(analysis['full']['controls']): raise ValueError('GCP set differs from v2 deduplication')
    fits=fit(gcps['points'])
    with tempfile.TemporaryDirectory() as tmp:
        out=pathlib.Path(tmp)
        v2.run(a.analysis,a.candidates,str(out/'v2.json'),str(out/'gcp.json'),str(out/'report.md'),a.v1)
        fronts=json.loads((out/'v2.json').read_text())['features']
    for f in fronts: f['id']=f['id'].replace('hh1938-v2-','hh1938-v3-',1); f['properties']['interpretation_id']='bmap-georef-v3'
    allrows={}; details=[]
    for group,readers in GROUPS.items():
        job=jobs[group]; page=analysis['full']['transforms'][job['page']]; lines=[]
        for reader in readers:
            line=read(pathlib.Path(a.trace_dir)/(group+reader+'.json'))['lines'][0]
            if line['status']!='partly_traced': raise ValueError(f'{group}{reader}: no trace')
            lines.append(line['vertices'])
        aligned,cut,spread,matching=align(lines); xy=[v2.mosaic(page,*p) for p in aligned]; coords=[v2.apply(fits['poly'],*p) for p in xy]
        diff=max(v2.distance(v2.apply(fits['poly'],*p),v2.apply(fits['affine'],*p)) for p in xy)
        disagreement=max((v2.distance(v2.apply(fits['poly'],*v2.mosaic(page,*p)),v2.apply(fits['poly'],*v2.mosaic(page,*q))) for row in matching for i,p in enumerate(row) for q in row[i+1:]),default=0)
        length=sum(v2.distance(p,q) for p,q in zip(coords,coords[1:]))/1000
        row=dict(group=group,readers=readers,job=job,coords=coords,cut=cut,spread=spread,diff=diff,disagreement=disagreement,length=length); details.append(row); allrows.setdefault(MODES[group],[]).append(row)
    base=copy.deepcopy(fronts[0]['properties']); features=fronts[:]
    def common(seg,typ,mode,observed,coords,geom,reason,note,locator):
        p=copy.deepcopy(base); p.update(feature_type=typ,segment_id=seg,interpretation_id='bmap-georef-v3',original_dating=observed['as_written'],evidence_mode=mode,spatial_error=reason,observed=observed,derivation=dict(method='georef_polynomial',gcp_set_id='bmap-r2-dedup',note=note),claims=[dict(claim_id='c-v3-'+seg+'-dating',source_id='src-jacar-d5-1939',supports=['dating','existence'],locator=locator),dict(claim_id='c-v3-'+seg+'-geometry',source_id='src-jacar-d5-1939',supports=['geometry'],locator='B 图 14日夕 实线，模型描线，经 bmap-r2-dedup 二次配准' if typ=='flood_extent' else 'B 图决口注记箭头端点经 bmap-r2-dedup 二次配准'),dict(claim_id='c-v3-'+seg+'-gcp',source_id='src-wikidata',supports=['geometry'],locator=v2.GCP_PATH)])
        return dict(type='Feature',id='hh1938-v3-'+seg,geometry=dict(type=geom,coordinates=coords),properties=p)
    for mode,rows in allrows.items():
        diff=max(r['diff'] for r in rows); disagreement=max(r['disagreement'] for r in rows); err=v2.error_m(fits['loo'],diff,disagreement)
        reason=dict(meters=err,reason=f"二次留一最大 {fits['loo']:.1f} m + 仿射与二次最大差 {diff:.1f} m + 描线读数间最大距离 {disagreement:.1f} m；取整到百米；单家无互证不代表零误差。")
        note='；'.join(f"{r['group']} {','.join(r['readers'])}，裁去 {r['cut']:.1f} px（含无共同覆盖端段）" for r in rows)
        loc='；'.join(f"{r['job']['page']} 注记 ({r['job']['lx']},{r['job']['ly']})" for r in rows)
        features.append(common('extent-0614-'+mode,'flood_extent',mode,dict(date_from='1938-06-14',date_to='1938-06-15',part_of_day='夕',as_written='14日夕'),[r['coords'] for r in rows],'MultiLineString',reason,note,loc))
    breach=[]
    for day in (10,11):
        matches=[c for c in candidates if c['kind']=='date' and c['page']=='p06' and all(r['as_written']==f'{day}日' for r in c['readings'].values()) and any('決潰' in r['note'] for r in c['readings'].values())]
        if len(matches)!=1: raise ValueError('ambiguous breach')
        c=matches[0]; tips=[r for r in c['readings'].values() if r['has_arrow'] and r['tip_x'] is not None and r['tip_y'] is not None]
        if len(tips)<2 or c['tip_unstable']: raise ValueError('unstable breach')
        xy=v2.mosaic(analysis['full']['transforms'][c['page']],statistics.mean(r['tip_x'] for r in tips),statistics.mean(r['tip_y'] for r in tips)); coord=v2.apply(fits['poly'],*xy); diff=v2.distance(coord,v2.apply(fits['affine'],*xy)); err=v2.error_m(fits['loo'],diff,0)
        reason=dict(meters=err,reason=f"二次留一最大 {fits['loo']:.1f} m + 仿射与二次差 {diff:.1f} m + 箭头端点估计 0 m；取整到百米。")
        obs=dict(date_from=f'1938-06-{day:02}',date_to=f'1938-06-{day+1:02}',part_of_day=None,as_written=f'{day}日 決潰')
        features.append(common(f'breach-06{day:02}','breach','reconstructed',obs,coord,'Point',reason,'图上注记的日期；与通行史述（6 月 9 日花园口掘堤）的关系未核，不在本数据里推断',f"p06 注记 ({c['x']:.1f},{c['y']:.1f})")); breach.append((day,coord,err))
    result=dict(type='FeatureCollection',meta=dict(schema_version='0.3.0',dataset_id='sam-huanghe1938-bmap-v3',dataset_revision='r1-2026-11-10',region='cn',stage='draft',synthetic=False,description='逐日前锋、范围边界及决口；范围线只有 14日夕 一个日期的试点。'),features=features)
    pathlib.Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    for r in details: print(f"line={r['group']} readers={','.join(r['readers'])} points={len(r['coords'])} km={r['length']:.3f} cut_px={r['cut']:.1f} spread_px={r['spread']:.1f} error_m={next(f['properties']['spatial_error']['meters'] for f in features if f['properties']['segment_id']=='extent-0614-'+MODES[r['group']])}")
    for day,coord,err in breach: print(f'breach={day} lon={coord[0]:.8f} lat={coord[1]:.8f} error_m={err}')
    print(f'features={len(features)} loo_max_m={fits["loo"]:.2f}')

def main():
    p=argparse.ArgumentParser()
    for name in ('analysis','candidates','gcp','jobs','trace-dir','v1','output'): p.add_argument('--'+name,required=True)
    build(p.parse_args())
if __name__=='__main__': main()
