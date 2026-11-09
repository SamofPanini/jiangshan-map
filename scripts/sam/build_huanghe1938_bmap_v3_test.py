#!/usr/bin/env python3
import copy, importlib.util, json, pathlib, subprocess, sys, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'scripts/sam/tools/build_huanghe1938_bmap_v3.py'
spec=importlib.util.spec_from_file_location('build',SCRIPT); build=importlib.util.module_from_spec(spec); spec.loader.exec_module(build)
DATA=ROOT/'data/sam/huanghe1938/huanghe1938_bmap_v3.geojson'
V2=ROOT/'data/sam/huanghe1938/fronts_bmap_georef_v2.geojson'
TRACE=ROOT/'docs/sam/audit/trace14'
def command(output,trace=TRACE):
    return [sys.executable,str(SCRIPT),'--analysis',str(ROOT/'docs/sam/audit/bmap_georef/analysis.json'),'--candidates',str(ROOT/'docs/sam/audit/bmap_georef/candidates.json'),'--gcp',str(ROOT/'docs/sam/audit/bmap_georef/gcp_set_bmap-r2-dedup.json'),'--jobs',str(TRACE/'jobs.json'),'--trace-dir',str(trace),'--v1',str(ROOT/'data/sam/huanghe1938/fronts_place_anchor_v1.geojson'),'--output',str(output)]
class Pilot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads(DATA.read_bytes()); cls.features=cls.data['features']
    def test_fronts_equal_v2(self):
        old=json.loads(V2.read_bytes())['features']; new=[copy.deepcopy(f) for f in self.features if f['properties']['feature_type']=='flood_front']
        self.assertEqual(len(new),11)
        for f in new+old: f.pop('id'); f['properties'].pop('interpretation_id')
        self.assertEqual(new,old)
    def test_modes_and_omission(self):
        self.assertEqual(build.MODES,{'g2':'reconstructed','g6':'reconstructed','g1':'hypothesis','g3':'hypothesis','g5':'hypothesis'})
        ext={f['properties']['evidence_mode']:f for f in self.features if f['properties']['feature_type']=='flood_extent'}
        self.assertEqual(set(ext),{'hypothesis','reconstructed'})
        for mode,groups in [('hypothesis',('g1','g3','g5')),('reconstructed',('g2','g6'))]:
            note=ext[mode]['properties']['derivation']['note']; self.assertEqual(len(ext[mode]['geometry']['coordinates']),len(groups))
            for group in groups: self.assertIn(group+' ',note)
            self.assertNotIn('g4 ',note)
    def test_cut_over_40(self):
        # The second trace diverges by 60 pixels on its later portion.
        a=[[x,0] for x in range(0,221,20)]; b=[[0,0],[100,0],[120,60],[220,60]]
        points,cut,spread,_=build.align([a,b]); self.assertGreater(cut,0); self.assertLessEqual(spread,40); self.assertLess(points[-1][0],200)
    def test_repeat_and_g6_t2_ignored(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d); trace=p/'trace'; trace.mkdir()
            for group,readers in build.GROUPS.items():
                for reader in readers:
                    src=TRACE/(group+reader+'.json'); (trace/src.name).write_bytes(src.read_bytes())
            (trace/'g6t2.json').write_bytes((TRACE/'g6t1.json').read_bytes())
            first=p/'one.json'; second=p/'two.json'
            for out in (first,second): subprocess.run(command(out,trace),cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
            self.assertEqual(first.read_bytes(),second.read_bytes()); self.assertEqual(first.read_bytes(),DATA.read_bytes())
if __name__=='__main__': unittest.main(verbosity=2)
