#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import copy, importlib.util, json, os, pathlib, subprocess, tempfile, unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
MODULE=os.environ.get('P15_MODULE',str(ROOT/'scripts/sam/tools/build_fronts_1938_bmap_v2.py'))
spec=importlib.util.spec_from_file_location('builder',MODULE); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
AN='docs/sam/audit/bmap_georef/analysis.json'; CA='docs/sam/audit/bmap_georef/candidates.json'; V1='data/sam/huanghe1938/fronts_place_anchor_v1.geojson'

class Tests(unittest.TestCase):
    def test_dedup_and_changed_name(self):
        c=[dict(name='a',x=1,y=2,lat=3,lon=4,page='p1',unrefined_gcp=False),dict(name='a',x=3,y=4,lat=3,lon=4,page='p2',unrefined_gcp=True),dict(name='b',x=5,y=6,lat=7,lon=8,page='p1',unrefined_gcp=False)]
        result=m.dedup(c); self.assertEqual(len(result),2); self.assertEqual(result[0]['mosaic_x'],2); self.assertEqual(result[0]['pages'],['p1','p2']); self.assertTrue(result[0]['unrefined_gcp'])
        changed=copy.deepcopy(c); changed[1]['name']='c'; self.assertEqual(len(m.dedup(changed)),3)
        changed=copy.deepcopy(c); changed[1]['lon']=9
        with self.assertRaises(ValueError): m.dedup(changed)
    def test_exclusions(self):
        for text,note,cat,page in [('10日','決潰','决口，另议','p06'),('15日','','侦察，另议','p06'),('7月11日','','7 月 11 日，另议','p05'),('六月十二日','','图例','p10'),('□ 12.00','','未规定或未能归类','p11'),('14日','','未规定或未能归类','p05')]:
            with self.subTest(text=text):
                r={'as_written':text,'note':note}; c={'page':page,'readings':{'a':r}}
                self.assertEqual(m.classify(c),(cat,None))
    def test_merge_and_review(self):
        a={'index':1,'page':'p05','center':(0,0),'key':'0612'}; b={'index':2,'page':'p06','center':(40,0),'key':'0612'}
        groups,review=m.merge([a,b]); self.assertEqual(len(groups),1); self.assertEqual(len(groups[0]),2); self.assertEqual(review,[])
        b['center']=(60,0); groups,review=m.merge([a,b]); self.assertEqual(len(groups),2); self.assertEqual(review,[(1,2,60.0)])
        b.update(center=(10,0),key='0613'); self.assertEqual(m.merge([a,b])[1],[(1,2,10.0)])
    def test_error(self):
        self.assertEqual(m.error_m(8230,1330,2640),12200)
        self.assertEqual(m.error_m(8230,1330,0),9600)
    def test_exclusions_in_real_pipeline(self):
        original=json.loads((ROOT/CA).read_text()); original_count=sum(x['kind']=='date' for x in original['candidates'])
        cases=[('10日','決潰','决口，另议','p06'),('15日','','侦察，另议','p06'),('7月11日','','7 月 11 日，另议','p05'),('六月十二日','','图例','p10'),('□ 12.00','','未规定或未能归类','p11'),('14日','','未规定或未能归类','p05')]
        for text,note,category,page in cases:
            original['candidates'].append(dict(kind='date',page=page,x=-100000,y=-100000,tip_unstable=False,readings={'a':dict(as_written=text,note=note,has_arrow=False,tip_x=None,tip_y=None)}))
        with tempfile.TemporaryDirectory() as t:
            p=pathlib.Path(t); candidate=p/'candidates'; candidate.write_text(json.dumps(original,ensure_ascii=False),encoding='utf8')
            def build(input_path,prefix):
                out=p/(prefix+'out'); rep=p/(prefix+'report')
                subprocess.run(['python3',MODULE,'--analysis',AN,'--candidates',str(input_path),'--output',str(out),'--gcp',str(p/(prefix+'gcp')),'--report',str(rep),'--v1',V1],cwd=ROOT,check=True,capture_output=True)
                return json.loads(out.read_text()),rep.read_text()
            baseline,_=build(CA,'a'); augmented,report=build(candidate,'b')
            self.assertEqual(baseline,augmented)
            for i,(_,_,category,_) in enumerate(cases): self.assertIn(category+'：#'+str(original_count+i),report)
    def test_bytes(self):
        with tempfile.TemporaryDirectory() as t:
            outputs=[]
            for i in (1,2):
                base=pathlib.Path(t)/str(i); base.mkdir(); out=base/'output'; gcp=base/'gcp'; rep=base/'report'
                subprocess.run(['python3',MODULE,'--analysis',AN,'--candidates',CA,'--output',str(out),'--gcp',str(gcp),'--report',str(rep),'--v1',V1],cwd=ROOT,check=True,capture_output=True)
                outputs.append(out.read_bytes())
            self.assertEqual(outputs[0],outputs[1])
            parsed=json.loads(outputs[0]); self.assertGreater(len(parsed['features']),0)
if __name__=='__main__': unittest.main(verbosity=2)
