#!/usr/bin/env python3
import importlib.util, math, unittest
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parent/'tools/bmap_georef.py'
spec=importlib.util.spec_from_file_location('bmap',P); b=importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
class GeorefTests(unittest.TestCase):
 def test_black_window_fails_and_excluded(self):
  r=b.refine(Image.new('L',(80,80),0),40,40)
  self.assertTrue(r['refine_failed'])
  self.assertFalse(b.eligible(dict(r,name='test',single_reader=False,name_disputed=False,non_circle=False)))
 def test_variants_and_majority(self):
  def read(name): return {'name':name}
  unanimous=b.choose_name('x',{'t':read('十里舗'),'a':read('十里鋪'),'b':read('十里舖')})
  self.assertFalse(unanimous['name_disputed']);self.assertTrue(unanimous['normalized_unanimous'])
  majority=b.choose_name('x',{'t':read('異名'),'a':read('十里舗'),'b':read('十里鋪')})
  self.assertFalse(majority['name_disputed']);self.assertEqual(majority['name_source'],'majority')
  self.assertTrue(b.eligible(dict(majority,single_reader=False,non_circle=False)))
 def test_geometry_outlier_is_listed(self):
  ps=[(100,100),(600,120),(100,650),(600,600),(350,300),(800,400),(300,800),(900,850)]
  def point(i,x,y):return dict(name=str(i),x=x,y=y,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False)
  a=[point(i,x,y) for i,(x,y) in enumerate(ps)];bb=[point(i,x+(120 if i==4 else 0),y) for i,(x,y) in enumerate(ps)]
  base,trans,paths,pairs=b.connect({'a':a,'b':bb}); trans=b.simultaneous(base,trans,pairs);rows=b.pair_residuals(trans,pairs)
  self.assertIn('4',[r['name'] for r in rows if r['residual_px']>15])
 def test_joint_bridge_without_three_on_one_pair(self):
  xy={'s1':(0,0),'s2':(300,0),'s3':(0,300),'s4':(300,300),'a1':(600,50),'a2':(550,450),'b1':(800,100),'b2':(850,500)}
  names={'a':['s1','s2','s3','s4','a1','a2'],'b':['s1','s2','s3','s4','b1','b2'],'c':['a1','a2','b1','b2']}; offsets={'a':(0,0),'b':(100,20),'c':(50,-120)}
  pages={}
  for page,ns in names.items():
   ox,oy=offsets[page];pages[page]=[dict(name=n,x=xy[n][0]+ox,y=xy[n][1]+oy,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False) for n in ns]
  base,trans,_,pairs=b.connect(pages,base='a');self.assertEqual(set(trans),{'a','b','c'});self.assertEqual(len(pairs['a','c']),2);self.assertEqual(len(pairs['b','c']),2)
  trans=b.simultaneous(base,trans,pairs);self.assertLess(max(q['residual_px'] for q in b.pair_residuals(trans,pairs)),1e-6)
 def test_xincai_excluded(self):
  p=dict(name='新蔡',readings={r:{'symbol':'小円'} for r in 'tab'},name_uncertain=False,name_disputed=False,non_circle=False,name_source='unanimous',normalized_unanimous=True,refine_failed=False)
  self.assertFalse(b.gcp_eligible(p));p['name']='開封';p['non_circle']=True
  for x in p['readings'].values():x['symbol']='四角'
  self.assertTrue(b.gcp_eligible(p))
 def test_three_page_affine_and_outlier(self):
  pts=[(100,100),(600,120),(100,650),(600,600),(350,300),(800,400),(300,800),(900,850)]
  pages={}
  for j in range(3):
   pages[f'p{j}']=[dict(name=f'place{i}',x=x-100*j,y=y+50*j,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False) for i,(x,y) in enumerate(pts)]
  pages['isolated']=[dict(name=f'place{i}',x=x,y=y,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False) for i,(x,y) in enumerate(pts[:2])]
  base,transforms,paths,pairs=b.connect(pages)
  self.assertNotIn('isolated',transforms)
  self.assertEqual(len(transforms),3)
  transforms=b.simultaneous(base,transforms,pairs)
  controls=[]
  for i,p in enumerate(pages['p0']):
   xy=b.apply(transforms['p0'],p['x'],p['y']); controls.append(dict(id=str(i),x=xy['lon'],y=xy['lat'],lon=114+p['x']*.0001+p['y']*.00001,lat=34+p['y']*.00009-p['x']*.00001))
  fit=b.fit(controls,'affine',True)
  self.assertLess(max(x['meters'] for x in fit['loo']),1)
  for page in ('p0','p1','p2'):
   for i,p in enumerate(pages[page]):
    xy=b.apply(transforms[page],p['x'],p['y']); predicted=b.apply(fit['transform'],xy['lon'],xy['lat']); target=controls[i]; self.assertLess(abs(predicted['lon']-target['lon'])+abs(predicted['lat']-target['lat']),1e-6)
  controls[4]['lat']+=5000/111195
  bad=b.fit(controls,'affine',True)
  self.assertEqual(max(bad['loo'],key=lambda x:x['meters'])['id'],'4')
if __name__=='__main__': unittest.main()
