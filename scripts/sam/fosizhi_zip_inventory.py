#!/usr/bin/env python3
"""Read DILA ZIP metadata and selected non-image files using HTTP byte ranges only."""
import argparse, collections, hashlib, json, os, re, struct, sys, time, urllib.error, urllib.request, zlib, xml.etree.ElementTree as ET

LIMIT=20*1024*1024
IMAGES={'.jpg','.jpeg','.tif','.tiff','.png'}
FILES=['g007_wulinfanzhi.zip','g015_dazhaoqinglusizhi.zip','g016_chijianjingcisizhi.zip','g017_yucenshanhuiyingaolihuayanjiaosizhi.zip','g018_fenghuangshanshengguosizhi.zip','g019_wulinliansizhi.zip','g020_longjingjianwenlu.zip','g021_wulinlingyinsizhi.zip','g022_zengxiuyunlinsizhi.zip','g023_xuxiuyunlinsizhi.zip','g024_hangzhoushangtianzhujiangsizhi.zip','g025_yunjushengshuisizhi.zip','g026_hupaodinghuisizhi.zip','g027_yunqijishi.zip','g028_longxingxiangfujietansizhi.zip','g029_xixifanyinzhi.zip','g030_chongfusizhi.zip','g031_xuchongfusizhi.zip','g032_jingshanzhi.zip','y109_jingshanji.zip']
class RangeSource:
 def __init__(self,data): self.data=data; self.reads=[]
 def get(self,a,b): self.reads.append((a,b)); return 206,self.data[a:b+1]
_last_request=0.0
def request(url,method='GET',start=None,end=None):
 global _last_request
 h={'User-Agent':'fosizhi-zip-inventory/1.0'}
 if start is not None: h['Range']=f'bytes={start}-{end}'
 req=urllib.request.Request(url,headers=h,method=method)
 for i in range(3):
  try:
   delay=1.0-(time.monotonic()-_last_request)
   if delay>0:time.sleep(delay)
   with urllib.request.urlopen(req,timeout=30) as r:
    result=(r.status,r.headers,r.read()); _last_request=time.monotonic(); return result
  except Exception:
   if i==2: raise
   time.sleep(1)
def catalog_lookup(path,ident):
 root=ET.parse(path).getroot(); found=None
 for e in root.iter():
  if e.attrib.get('n')==ident: found=e; break
 if found is None:return {'id':ident,'title':None,'editor':None,'edition_or_year':None,'location':None,'hangzhou':'未判定','basis':'目录中无对应条目'}
 txt=lambda e:' '.join(''.join(e.itertext()).split()) if e is not None else None
 title=next((x for x in found.iter() if x.tag.endswith('title')),None)
 editor=next((x for x in found.iter() if x.tag.endswith('editor') or x.tag.endswith('author')),None)
 ed=next((x for x in found.iter() if x.tag.endswith('edition') or x.tag.endswith('date')),None)
 loc=next((x for x in found.iter() if x.tag.endswith('placeName')),None); location=txt(loc)
 hz='yes' if location and ('杭州' in location or '錢塘' in location) else ('no' if location else '未判定')
 return {'id':ident,'title':txt(title),'editor':txt(editor),'edition_or_year':txt(ed),'location':location,'hangzhou':hz,'basis':location or '目录未著录所在地'}
def analyze_tei(raw):
 root=ET.fromstring(raw); ns=lambda t:t.split('}',1)[0][1:] if t.startswith('{') else ''
 counts=collections.Counter(x.tag for x in root.iter()); header=next((x for x in root.iter() if x.tag.endswith('teiHeader')),None)
 title=next((x for x in header.iter() if x.tag.endswith('title')),None) if header is not None else None
 rev=next((x for x in header.iter() if x.tag.endswith('revisionDesc')),None) if header is not None else None
 textnode=next((x for x in root.iter() if x.tag.split('}')[-1]=='text'),root)
 plain=''.join(textnode.itertext()); classes={k:[x for x in textnode.iter() if x.tag.split('}')[-1].lower() in vals] for k,vals in {'person':['persname'],'place':['placename'],'time':['date','time']}.items()}
 def attr_summary(nodes):
  d={}
  for x in nodes:
   for k,v in x.attrib.items():
    a=d.setdefault(k,{'count':0,'samples':[]});a['count']+=1
    if len(a['samples'])<3 and re.search(r'(^|[:/#])([A-Z]{1,5}\d{2,}|\d{4,}|[a-z]+\d+)',v,re.I):a['samples'].append(v)
  return d
 marks=collections.defaultdict(list)
 for x in root.iter():
  if x.tag.split('}')[-1].lower() in ('pb','lb','milestone'):marks[x.tag].append(x)
 return {'present':True,'root':root.tag,'namespace':ns(root.tag),'title':' '.join(title.itertext()).strip()[:80] if title is not None else None,'version_statement':' '.join(rev.itertext()).strip()[:80] if rev is not None else None,'element_counts':counts.most_common(40),'semantic':{k:{'present':bool(v),'count':len(v),'elements':sorted(set(x.tag for x in v)),'attributes':attr_summary(v)} for k,v in classes.items()},'page_line_marks':{k:{'count':len(v),'attributes':attr_summary(v)} for k,v in marks.items()},'text_characters':len(plain)}
def inventory_one(name,base,catalog,cache,source=None):
 ident=name.split('_',1)[0]; url=base.rstrip('/')+'/'+name
 if source is None:
  status,h,_=request(url,'HEAD'); length=int(h.get('Content-Length','0')); lm=h.get('Last-Modified'); ar=h.get('Accept-Ranges')
  print(f'ZIP {name} URL={url} Content-Length={length} Last-Modified={lm} members=pending',flush=True)
  if ar!='bytes':return {'zip':{'filename':name,'url':url,'content_length':length,'last_modified':lm,'accept_ranges':ar,'range_status':'blocked_no_range'},'members':{'total':0,'extension_counts':{},'image_bytes':0,'non_image':[]}}
  st,_,tail=request(url,start=max(0,length-65557),end=length-1)
  if st!=206:return {'zip':{'filename':name,'url':url,'content_length':length,'last_modified':lm,'accept_ranges':ar,'range_status':'blocked_no_range'},'members':{'total':0,'extension_counts':{},'image_bytes':0,'non_image':[]}}
  p=tail.rfind(b'PK\x05\x06'); _,disk,cdisk,n1,n,cdsize,cdoff,comment=struct.unpack_from('<4s4H2LH',tail,p)
  if n==0xffff or cdsize==0xffffffff: raise ValueError('ZIP64 central directory unsupported')
  st,_,cd=request(url,start=cdoff,end=cdoff+cdsize-1)
  if st!=206: raise RuntimeError('central directory did not return 206')
 else:
  length=len(source.data); lm=None; ar='bytes'; cdoff=source.data.rfind(b'PK\x05\x06'); cdsize=struct.unpack_from('<L',source.data,cdoff+12)[0]; cdoff=struct.unpack_from('<L',source.data,cdoff+16)[0]; cd=source.data[cdoff:cdoff+cdsize]
 entries=[]; off=0
 while off<len(cd):
  if cd[off:off+4]!=b'PK\x01\x02':raise ValueError('invalid central directory')
  vals=struct.unpack_from('<4s6H3L5H2L',cd,off); method=vals[4]; crc=vals[7]; csize=vals[8]; usize=vals[9]; fnl,exl,col=vals[10:13]; lhoff=vals[-1]
  fn=cd[off+46:off+46+fnl].decode('utf8','replace'); entries.append((fn,method,crc,csize,usize,lhoff)); off+=46+fnl+exl+col
 ext=collections.Counter(os.path.splitext(x[0])[1].lower() or '[none]' for x in entries); imagebytes=sum(x[4] for x in entries if os.path.splitext(x[0])[1].lower() in IMAGES); cached=[]; blobs={}
 print(f'ZIP {name} URL={url} Content-Length={length} Last-Modified={lm} members={len(entries)}',flush=True)
 for fn,m,crc,cs,us,lo in entries:
  if os.path.splitext(fn)[1].lower() in IMAGES:continue
  if us>LIMIT: raise RuntimeError(f'skipped_too_large: {fn} ({us})')
  if source is None:
   st,_,lh=request(url,start=lo,end=lo+29)
   if st!=206:raise RuntimeError('local header range failed')
   fnlen,xlen=struct.unpack_from('<HH',lh,26); start=lo+30+fnlen+xlen; st,_,raw=request(url,start=start,end=start+cs-1)
   if st!=206:raise RuntimeError('member range failed')
  else:
   data=source.data; fnlen,xlen=struct.unpack_from('<HH',data,lo+26); start=lo+30+fnlen+xlen; raw=data[start:start+cs]
  content=raw if m==0 else zlib.decompress(raw,-15)
  if len(content)!=us or zlib.crc32(content)&0xffffffff!=crc:raise ValueError('CRC/size mismatch: '+fn)
  sha=hashlib.sha256(content).hexdigest(); dest=os.path.join(cache,ident,fn); os.makedirs(os.path.dirname(dest),exist_ok=True); open(dest,'wb').write(content)
  cached.append({'path':fn,'bytes':us,'crc32':f'{crc:08x}','sha256':sha,'cache_path':dest}); blobs[fn]=content
  print(f'MEMBER {ident}/{fn} bytes={us} sha256={sha}',flush=True)
 tei=next((v for k,v in blobs.items() if k.lower().endswith('.tei.xml')),None); mets=next((v for k,v in blobs.items() if k.lower().endswith('.mets.xml')),None)
 lic=[]
 for fn,b in blobs.items():
  if os.path.basename(fn).lower().startswith(('readme','copying')):
   text=b.decode('utf8','replace')
   lic += [s.strip() for s in re.split(r'(?<=[.!?。；])\s*|\n+',text) if re.search(r'licen|copyright|right|permission|source|影印|版权|著作权|權利|來源|授權',s,re.I)]
 lic_text=[]
 for s in lic:
  if sum(map(len,lic_text))+len(s)>600:break
  lic_text.append(s)
 mets_groups={}
 if mets:
  mr=ET.fromstring(mets)
  for fg in (x for x in mr.iter() if x.tag.endswith('fileGrp')):
   label=fg.attrib.get('USE','(unspecified)'); mets_groups[label]=sum(1 for x in fg.iter() if x.tag.endswith('file'))
 return {'zip':{'filename':name,'url':url,'content_length':length,'last_modified':lm,'accept_ranges':ar,'range_status':'ok'},'members':{'total':len(entries),'extension_counts':dict(ext),'image_bytes':imagebytes,'non_image':cached},'tei':analyze_tei(tei) if tei else {'present':False},'mets':{'present':bool(mets),'file_groups':mets_groups},'license_files':{'quotes':lic_text,'license_name':'CC BY-SA' if any('CC BY-SA' in s for s in lic_text) else '未明确','mentions_base_or_publisher_rights':any(re.search('影印|publisher|出版社',s,re.I) for s in lic_text),'distinguishes_text_image':any(re.search('image|影像|文字',s,re.I) for s in lic_text)},'catalog':catalog_lookup(catalog,ident)}
def main():
 p=argparse.ArgumentParser(); p.add_argument('--ids',required=True);p.add_argument('--base-url',required=True);p.add_argument('--catalog',required=True);p.add_argument('--cache-dir',required=True);p.add_argument('--out',required=True);a=p.parse_args()
 names=FILES if a.ids=='all' else [x.strip() for x in a.ids.split(',')]
 if os.path.isfile(a.ids): names=[x.strip() for x in open(a.ids) if x.strip()]
 result=[]
 for n in names:
  result.append(inventory_one(n,a.base_url,a.catalog,a.cache_dir));time.sleep(1)
 open(a.out,'w',encoding='utf8').write(json.dumps({'packages':result},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
