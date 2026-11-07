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
  self.assertFalse(b.eligible(dict(r,single_reader=False,name_disputed=False,non_circle=False)))
 def test_three_page_affine_and_outlier(self):
  pts=[(100,100),(600,120),(100,650),(600,600),(350,300),(800,400),(300,800),(900,850)]
  pages={}
  for j in range(3):
   pages[f'p{j}']=[dict(name=f'place{i}',x=x-100*j,y=y+50*j,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False) for i,(x,y) in enumerate(pts)]
  pages['isolated']=[dict(name=f'place{i}',x=x,y=y,single_reader=False,name_disputed=False,non_circle=False,refine_failed=False) for i,(x,y) in enumerate(pts[:2])]
  base,transforms,paths,pairs=b.connect(pages)
  self.assertNotIn('isolated',transforms)
  self.assertEqual(len(transforms),3)
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
