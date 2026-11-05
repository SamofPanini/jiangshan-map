import hashlib, io, os, struct, tempfile, unittest, zipfile, subprocess, sys
sys.path.insert(0,os.path.dirname(__file__))
import fosizhi_zip_inventory as inv

class InventoryTests(unittest.TestCase):
 def archive(self,bad=False,xml=b'<TEI><text>ok</text></TEI>'):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
   z.writestr('a.jpg',b'IMAGE');z.writestr('x.tei.xml',xml);z.writestr('readme.txt',b'CC BY-SA')
  data=bytearray(b.getvalue())
  if bad:
   pos=data.find(b'CC BY-SA');data[pos]=ord('X')
  return bytes(data)
 def test_memory_ranges_skip_images_sha(self):
  src=inv.RangeSource(self.archive())
  with tempfile.TemporaryDirectory() as d:
   old=inv.request
   try:
    def fake(url,method='GET',start=None,end=None):
     if method=='HEAD':return 200,{'Content-Length':str(len(src.data)),'Last-Modified':'x','Accept-Ranges':'bytes'},b''
     return src.get(start,end)[0],{},src.data[start:end+1]
    inv.request=fake
    inv.catalog_lookup=lambda path,ident:{'id':ident,'hangzhou':'未判定'}
    row=inv.inventory_one('g017_test.zip','https://example.invalid','unused',d,src)
    self.assertEqual(row['members']['total'],3);self.assertEqual(len(row['members']['non_image']),2)
    self.assertEqual(row['members']['image_bytes'],5)
    self.assertEqual(row['tei']['present'],True)
    self.assertEqual(hashlib.sha256(open(row['members']['non_image'][0]['cache_path'],'rb').read()).hexdigest(),row['members']['non_image'][0]['sha256'])
   finally:inv.request=old
 def test_invalid_xml_raises(self):
  with self.assertRaises(Exception):inv.analyze_tei(b'<TEI>')
 def test_cli_rejects_missing_and_unknown(self):
  for args in ([],['--wat']):
   p=subprocess.run([sys.executable,os.path.join(os.path.dirname(__file__),'fosizhi_zip_inventory.py')]+args,capture_output=True)
   self.assertNotEqual(p.returncode,0)
 def test_crc_corruption_raises(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w',zipfile.ZIP_STORED) as z:z.writestr('x.txt',b'good')
  data=bytearray(b.getvalue());data[data.find(b'good')]=ord('b')
  src=inv.RangeSource(bytes(data))
  with tempfile.TemporaryDirectory() as d, self.assertRaises(Exception):inv.inventory_one('g017_test.zip','x','x',d,src)
 def test_full_response_blocked(self):
  old=inv.request
  try:
   inv.request=lambda *a,**k:(200,{'Content-Length':'10','Accept-Ranges':'bytes'},b'1234567890')
   row=inv.inventory_one('g017_test.zip','https://example.invalid','x','/tmp')
   self.assertEqual(row['zip']['range_status'],'blocked_no_range')
  finally:inv.request=old

if __name__=='__main__':unittest.main()
