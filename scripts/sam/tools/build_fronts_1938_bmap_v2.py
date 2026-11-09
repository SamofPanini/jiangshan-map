#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build P1-5 outputs from explicitly supplied P1-4 analysis and candidates."""
import argparse, collections, datetime, hashlib, json, math, pathlib, statistics, subprocess

GCP_PATH = 'docs/sam/audit/bmap_georef/gcp_set_bmap-r2-dedup.json'

def dedup(controls):
    groups = collections.defaultdict(list)
    for c in controls: groups[c['name']].append(c)
    out = []
    for name, rows in sorted(groups.items()):
        coords = {(r['lat'], r['lon']) for r in rows}
        if len(coords) != 1: raise ValueError('conflicting coordinates: '+name)
        lat, lon = next(iter(coords))
        out.append(dict(name=name, mosaic_x=statistics.mean(r['x'] for r in rows), mosaic_y=statistics.mean(r['y'] for r in rows), lat=lat, lon=lon, pages=sorted({r['page'] for r in rows}), unrefined_gcp=any(r['unrefined_gcp'] for r in rows)))
    return out

def normalize_date(s):
    import re
    compact = re.sub(r'\s+', '', s)
    if compact in ('25日28日', '25日｜28日', '25日～28日', '25～28日'):
        return '25～28日'
    return s

def classify(c):
    page, x, y = c['page'], c.get('x'), c.get('y')
    if page == 'p07' and x is not None and abs(x-440.5)<2 and abs(y-453.5)<2:
        return ('非注记（档案页码戳）', None)
    if (page == 'p08' and x is not None and abs(x-2366.3)<2 and abs(y-1602.3)<2) or (page == 'p10' and x is not None and abs(x-2334)<2 and abs(y-177.7)<2):
        return ('纳入', '0618-1500')
    vals = [normalize_date(r['as_written']) for r in c['readings'].values()]
    if c['page']=='p10' and all(s.startswith('六月') for s in vals): return ('图例', None)
    if all(s in ('10日','11日') for s in vals) and any('決潰' in r['note'] for r in c['readings'].values()): return ('决口，另议', None)
    if all(s in ('15日','24日') for s in vals): return ('侦察，另议', None)
    if all(s=='7月11日' for s in vals): return ('7 月 11 日，另议', None)
    allowed={'12日':'0612','13日夕':'0613','14日夕':'0614','17日夕':'0617','18日':'0618','19日':'0619','25日':'0625','25～28日':'0625-0628','28日':'0628','29日':'0629','7月2日':'0702','7月8日':'0708'}
    keys=[]
    for s in vals:
        if s in allowed: keys.append(allowed[s]); continue
        import re
        m=re.fullmatch(r'(18|25)日\s+(\d{1,2})\.(\d{2})',s)
        if m and int(m[2])<24 and int(m[3])<60: keys.append('06'+m[1]+'-'+m[2].zfill(2)+m[3]); continue
        return ('未规定或未能归类', None)
    return ('纳入',keys[0]) if len(set(keys))==1 else ('未规定或未能归类',None)

def apply(t,x,y):
    return (sum(a*b for a,b in zip(t['lon'],[1,x,y,x*x,x*y,y*y])),sum(a*b for a,b in zip(t['lat'],[1,x,y,x*x,x*y,y*y])))

def distance(a,b):
    lon1,lat1,lon2,lat2=map(math.radians,(a[0],a[1],b[0],b[1])); h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 2*6371008.8*math.asin(min(1,math.sqrt(h)))

def mosaic(t,x,y): return (t['lon'][0]+t['lon'][1]*x+t['lon'][2]*y,t['lat'][0]+t['lat'][1]*x+t['lat'][2]*y)

def merge(rows):
    # Only cross-page pairs qualify. Refuse ambiguous multiple matches rather than bridge groups.
    groups=[]; review=[]
    for row in rows:
        matches=[]
        for g in groups:
            if any(r['page']==row['page'] for r in g): continue
            d=min(math.dist(row['center'],r['center']) for r in g)
            if d<=40 and row['key']==g[0]['key']: matches.append(g)
            elif (d<=40 and row['key']!=g[0]['key']) or (40<d<=80 and row['key']==g[0]['key']): review.append((g[0]['index'],row['index'],round(d,2)))
        if len(matches)>1: raise ValueError('ambiguous cross-page merge: '+str(row['index']))
        if matches: matches[0].append(row)
        else: groups.append([row])
    return groups,review

def attach_singles(groups, rows):
    excluded = []
    for row in rows:
        matches = [g for g in groups if any(math.dist(row['center'], r['center']) <= 40 and len(r['candidate']['readings']) >= 2 for r in g)]
        if len(matches) > 1: raise ValueError('ambiguous single-reader match: '+str(row['index']))
        if matches:
            row['key'] = matches[0][0]['key']
            matches[0].append(row)
        else:
            row['category'] = '单家读数'
            excluded.append(row)
    return excluded

def error_m(loo, diff, estimate): return int(math.floor((loo+diff+estimate)/100+0.5))*100

def run(analysis_path,candidate_path,out_path,gcp_path,report_path,v1_path):
    if pathlib.Path(report_path).exists(): raise FileExistsError('report already exists; use a new staging path to preserve prior reports')
    raw=pathlib.Path(analysis_path).read_bytes(); analysis=json.loads(raw); cr=pathlib.Path(candidate_path).read_bytes(); candidates=json.loads(cr)['candidates']
    controls=analysis['full']['controls']; gcps=dedup(controls)
    print(f'input={analysis_path} sha256={hashlib.sha256(raw).hexdigest()} controls={len(controls)}')
    dates=[c for c in candidates if c['kind']=='date']; print(f'input={candidate_path} sha256={hashlib.sha256(cr).hexdigest()} dates={len(dates)}')
    js="""const c=require('./tools/sam/georef/georef_core.js');let p=JSON.parse(require('fs').readFileSync(0,'utf8'));let out={};for(let k of ['affine','poly2']){let t=k==='affine'?c.fitAffine(p):c.fitPoly2(p);let loo=c.looResiduals(k,p).map(x=>x.meters);if(loo.some(x=>!Number.isFinite(x)))throw Error('LOO unavailable');loo.sort((a,b)=>a-b);out[k]={transform:t,rms:c.rms(c.residuals(t,p)),median:(loo[(loo.length-1)>>1]+loo[loo.length>>1])/2,max:loo[loo.length-1]}}process.stdout.write(JSON.stringify(out));"""
    pairs=[dict(x=g['mosaic_x'],y=g['mosaic_y'],lon=g['lon'],lat=g['lat'],name=g['name']) for g in gcps]
    fits=json.loads(subprocess.run(['node','-e',js],input=json.dumps(pairs),text=True,capture_output=True,check=True).stdout)
    rows=[]; excluded=[]
    for i,c in enumerate(dates):
        category,key=classify(c); label='/'.join(k+':'+v['as_written'].replace('\n',' ') for k,v in c['readings'].items()); t=analysis['full']['transforms'][c['page']]; center=mosaic(t,c['x'],c['y'])
        row=dict(index=i,page=c['page'],center=center,key=key,label=label,local=(c['x'],c['y']),candidate=c,category=category)
        rows.append(row)
    # Unknowns may attach only to a unique already classified nearby cross-page mark.
    for row in rows:
        if row['category']!='未规定或未能归类': continue
        eligible=[r for r in rows if r['category']=='纳入' and r['page']!=row['page'] and math.dist(r['center'],row['center'])<=40]
        # Only unreadable dates, never unsupported readable expressions, can inherit classification.
        if len(eligible)==1 and all('□' in v['as_written'] for v in row['candidate']['readings'].values()): row['key']=eligible[0]['key']; row['category']='纳入'
    inc=[r for r in rows if r['category']=='纳入' and len(r['candidate']['readings']) >= 2]
    singles=[r for r in rows if r['category']=='纳入' and len(r['candidate']['readings']) < 2]
    excluded=[r for r in rows if r['category']!='纳入']; groups,review=merge(inc)
    excluded.extend(attach_singles(groups,singles))
    details=[]
    for group in groups:
        centers=[]; arrows=[]
        for r in group:
            c=r['candidate']; t=analysis['full']['transforms'][r['page']]
            centers.append(r['center'])
            tips=[v for v in c['readings'].values() if v['has_arrow'] and v['tip_x'] is not None and v['tip_y'] is not None]
            if len(tips)>=2 and not c['tip_unstable']:
                arrows.append(mosaic(t,statistics.mean(v['tip_x'] for v in tips),statistics.mean(v['tip_y'] for v in tips)))
        locs=arrows if arrows else centers
        method='箭头端点' if arrows else '注记中心'
        xy=tuple(statistics.mean(p[i] for p in locs) for i in (0,1)); q=apply(fits['poly2']['transform'],*xy); a=apply(fits['affine']['transform'],*xy); diff=distance(q,a)
        # Conservative isotropic 50 px estimate: largest local cardinal displacement.
        estimate=max(distance(q,apply(fits['poly2']['transform'],xy[0]+dx,xy[1]+dy)) for dx,dy in ((50,0),(-50,0),(0,50),(0,-50))) if method=='注记中心' else 0
        method_desc = '箭头端点（仅用至少两家且稳定的页；其余读数参与归类）' if arrows and len(arrows)<len(group) else '、'.join([method]*len(group))
        details.append(dict(group=group,xy=xy,coord=q,diff=diff,estimate=estimate,method=method_desc))
    bykey=collections.defaultdict(list)
    for d in details: bykey[d['group'][0]['key']].append(d)
    features=[]; lines=[]
    for key,ds in sorted(bykey.items()):
        seg='front-'+key; day=key[:4]; start=datetime.date(1938,int(day[:2]),int(day[2:])); end=datetime.date(1938,6,29) if key=='0625-0628' else start+datetime.timedelta(days=1)
        pod=('夕' if day in ('0613','0614','0617') else (key[5:7]+'.'+key[7:9] if len(key)==9 else None))
        written=ds[0]['group'][0]['candidate']['readings']; written=next(iter(written.values()))['as_written']; maxdiff=max(d['diff'] for d in ds); est=max(d['estimate'] for d in ds); err=error_m(fits['poly2']['max'],maxdiff,est)
        notes=[]; loc=[]
        for d in ds:
            refs='；'.join(f"{r['page']} ({r['local'][0]:.1f},{r['local'][1]:.1f}) [{r['label']}]" for r in d['group']); loc.append(refs)
            notes.append(f"{refs}：{d['method']}；仿射与二次相距 {d['diff']:.1f} m")
            lines.append(f"| {key} | {refs} | {d['method']} | {d['coord'][0]:.6f}, {d['coord'][1]:.6f} | {d['diff']:.1f} | {err} |")
        pts=[list(d['coord']) for d in ds]; geom={'type':'Point','coordinates':pts[0]} if len(pts)==1 else {'type':'MultiPoint','coordinates':pts}
        claims=[dict(claim_id='c-v2-'+seg+'-dating',source_id='src-jacar-d5-1939',supports=['dating','existence'],locator='；'.join(loc)),dict(claim_id='c-v2-'+seg+'-geometry',source_id='src-jacar-d5-1939',supports=['geometry'],locator='B 图注记位置经 bmap-r2-dedup 二次配准'),dict(claim_id='c-v2-'+seg+'-gcp',source_id='src-wikidata',supports=['geometry'],locator=GCP_PATH)]
        props=dict(region='cn',feature_type='flood_front',waterbody_id='huanghe-1938-flood',segment_id=seg,interpretation_id='bmap-georef-v2',valid=dict(from_=1938,to=1939,interval='half_open',from_status='known',to_status='known'),original_dating=written,evidence_mode='reconstructed',review_state='proposed',dating_uncertainty=dict(years=0,reason='原图逐日标注；年份由图题「昭和十三年度」确定'),spatial_error=dict(meters=err,reason=f"二次留一最大 {fits['poly2']['max']:.1f} m + 仿射与二次最大差 {maxdiff:.1f} m + 文字中心 50 px 局部最大方向换算 {est:.1f} m（估计）；取整到百米。文字中心为注记位置而非前锋线点；箭头端点据读数亦待核。"),geometry_absent_reason=None,license_status='unknown',claims=claims,supersedes=[],observed=dict(date_from=str(start),date_to=str(end),part_of_day=pod,as_written=written),derivation=dict(method='georef_polynomial',gcp_set_id='bmap-r2-dedup',note='位置为注记中心或箭头端点，并非经确认的前锋线点；'+'；'.join(notes)))
        props['valid']['from']=props['valid'].pop('from_'); features.append(dict(type='Feature',id='hh1938-v2-'+seg,geometry=geom,properties=props))
    dataset=dict(type='FeatureCollection',meta=dict(schema_version='0.2.0',dataset_id='sam-huanghe1938-fronts-bmap-georef',dataset_revision='r1-2026-11-09',region='cn',stage='draft',synthetic=False,description='B 图日期注记中心或箭头端点经二次配准；不是已确认的前锋线。'),features=features)
    gcp=dict(gcp_set_id='bmap-r2-dedup',source=dict(path=analysis_path,sha256=hashlib.sha256(raw).hexdigest()),points=gcps)
    for path,obj in ((out_path,dataset),(gcp_path,gcp)): pathlib.Path(path).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    v1=json.loads(pathlib.Path(v1_path).read_bytes()); comparisons=[]
    for old in v1['features']:
        if old['id'] not in ('hh1938-front-0614','hh1938-front-0617','hh1938-front-0708'): continue
        oldpts=old['geometry']['coordinates']; oldpts=[oldpts] if old['geometry']['type']=='Point' else oldpts
        new=bykey.get(old['properties']['segment_id'][6:],[])
        comparisons.append(old['id']+'：'+('；'.join(f"v2 点 {j+1} 至 v1 点 {i+1}：{distance(d['coord'],p)/1000:.2f} km" for j,d in enumerate(new) for i,p in enumerate(oldpts)) or '无 v2 点'))
    report=['# P1-5｜前锋数据 v2','', '## 交付物清单','',f'- 生成器、测试、GeoJSON、控制点集及本报告。输入 analysis SHA256 `{hashlib.sha256(raw).hexdigest()}`；candidates SHA256 `{hashlib.sha256(cr).hexdigest()}`。','', '## 验证结果（逐项）','',f'- 控制点观测 {len(controls)}，去重后 {len(gcps)}。']
    for k in ('poly2','affine'): report.append(f"- {k}：RMS {fits[k]['rms']:.2f} m；留一中位 {fits[k]['median']:.2f} m；最大 {fits[k]['max']:.2f} m。")
    report+=['','| 日期 | 页及像素、各家读法 | 落点 | 经度、纬度 | 模型差 m | 空间误差 m |','|---|---|---|---|---:|---:|']+lines+['','### 排除清单','']+[f"- {r['category']}：#{r['index']} {r['page']} ({r['local'][0]:.1f},{r['local'][1]:.1f}) {r['label']}" for r in excluded]+['','### 待看（候选编号与文字中心像素距离）','']+[f'- #{a} / #{b}: {dist:.2f} px' for a,b,dist in review]+['','### v1 对照','']+['- '+x for x in comparisons]+['','## 规格偏差','', '待补充验证及范围判定。','', 'P1-5 BLOCKED']
    pathlib.Path(report_path).write_text('\n'.join(report)+'\n',encoding='utf8')
    print(f'gcps={len(gcps)} features={len(features)} points={len(details)} excluded={len(excluded)} review={len(review)}')

def main():
    p=argparse.ArgumentParser();
    for arg in ('analysis','candidates','output','gcp','report','v1'): p.add_argument('--'+arg,required=True)
    a=p.parse_args(); run(a.analysis,a.candidates,a.output,a.gcp,a.report,a.v1)
if __name__=='__main__': main()
