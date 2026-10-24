#!/usr/bin/env python3
"""Build the first real research dataset: 1938 New Yellow River flood fronts, anchored on place names.

Input : data/sam/gazetteer/huanghe1938_gazetteer.json (modern coordinates, mostly Wikidata)
Output: data/sam/huanghe1938/fronts_place_anchor_v1.geojson and fronts_sources.json (contract v0.2.0)

The anchor table below is curated by the main session from docs/sam/audit/P0b-7_flood_timeline_1938.md.
Every located anchor was checked against the page image (D5 p06, p07; A-map text for 太和).
A front mark is only anchored when the date label's arrow points at the front line right next to a
place that the gazetteer located; otherwise geometry is null with geometry_absent_reason not_located.
Usage: python3 scripts/sam/tools/build_fronts_1938_place_anchor.py   (run from the repo root; fail-closed)"""
import json
import os
import sys

ROOT = os.getcwd()
GAZ = os.path.join(ROOT, "data/sam/gazetteer/huanghe1938_gazetteer.json")
OUT = os.path.join(ROOT, "data/sam/huanghe1938")
if not os.path.isfile(GAZ):
    sys.exit(f"gazetteer not found: {GAZ} (run from the repo root)")
gaz = {x["name_on_map"]: x for x in json.load(open(GAZ, encoding="utf-8")) if x["status"] == "FOUND"}

D5 = "src-jacar-d5-1939"
D4 = "src-jacar-d4-1938"
WD = "src-wikidata"
ERR_M = 5000
ERR_REASON = "地名锚定：取日期标记所指前锋线旁、已定位地名的现代坐标；前锋实际位置估计在该地数公里内，5000 m 为估计值而非量测值"

# (segment, date_from, date_to, part_of_day, as_written, anchors, dating locator, anchor note)
ANCHORS = [
    ("front-0613", "1938-06-13", "1938-06-14", "夕", "13日夕", [],
     [(D5, "其一 D5 p06：關家橋、大井附近两处「13日夕」")], "所指地名 關家橋、大井 在地名表中未查到坐标"),
    ("front-0614", "1938-06-14", "1938-06-15", "夕", "14日夕", ["圃田集", "白潭"],
     [(D5, "其一 D5 p06：圃田集东侧前锋线旁「14日夕」；D5 p07：十八里集与白潭之间「14日夕」")],
     "两处标记分属不同泛流，故用 MultiPoint；开封西侧大井附近另有「14日夕」未锚定"),
    ("front-0617", "1938-06-17", "1938-06-18", "夕", "17日夕", ["常營集"],
     [(D5, "其一 D5 p07：常營集—遜母口之间前锋线旁「17日夕」")], "常營集今属太康县常营镇"),
    ("front-0619", "1938-06-19", "1938-06-20", None, "19日", [],
     [(D5, "其一 D5 p05・p06：岳店附近「19日」")], "岳店 在地名表中未查到坐标"),
    ("front-0625", "1938-06-25", "1938-06-29", None, "25～28日", [],
     [(D5, "其一 D5 p05・p06：十里鋪以南「25～28日」")], "十里鋪 同名村多，未能唯一定位"),
    ("front-0629", "1938-06-29", "1938-06-30", None, "29日", [],
     [(D5, "其一 D5 p05・p07：張庄附近「29日」")], "張庄 为通名，未查"),
    ("front-0702", "1938-07-02", "1938-07-03", None, "7月2日", [],
     [(D5, "其一 D5 p09・p11「7月2日」；其二 D5 p20「7.2 光武廟附近ニ達ス」"), (D4, "附圖第一 D4 p10「7,2 光武廟附近ニ達ス」")],
     "光武廟 在地名表中 NOT-FOUND（扶沟、淮阳、项城一带有多处同名）"),
    ("front-0708", "1938-07-08", "1938-07-09", None, "7月8日", ["太和"],
     [(D5, "其一 D5 p11「7月8日」；其二 D5 p20「7.8 太和附近ニ達ス」"), (D4, "附圖第一 D4 p10「7,8 太和附近ニ達ス」")],
     "注记原文点名太和；坐标用 Wikidata 太和县（主会话改正）"),
]

features = []
for seg, d0, d1, pod, written, places, dating, note in ANCHORS:
    missing = [p for p in places if p not in gaz]
    if missing:
        sys.exit(f"{seg}: anchor place not FOUND in gazetteer: {missing}")
    pts = [[round(gaz[p]["lon"], 6), round(gaz[p]["lat"], 6)] for p in places]
    geom = None if not pts else ({"type": "Point", "coordinates": pts[0]} if len(pts) == 1 else {"type": "MultiPoint", "coordinates": pts})
    claims = [{"claim_id": f"c-{seg}-dating-{i + 1}", "source_id": s, "supports": ["dating", "existence"], "locator": loc}
              for i, (s, loc) in enumerate(dating)]
    for p in places:
        claims.append({"claim_id": f"c-{seg}-geom-{p}", "source_id": WD, "supports": ["geometry"],
                       "locator": f"{p}：{gaz[p]['source_url']}"})
    features.append({
        "type": "Feature", "id": f"hh1938-{seg}", "geometry": geom,
        "properties": {
            "region": "cn", "feature_type": "flood_front", "waterbody_id": "huanghe-1938-flood",
            "segment_id": seg, "interpretation_id": "place-anchor-v1",
            "valid": {"from": 1938, "to": 1939, "interval": "half_open", "from_status": "known", "to_status": "known"},
            "original_dating": written, "evidence_mode": "attested", "review_state": "proposed",
            "dating_uncertainty": {"years": 0, "reason": "原图逐日标注；年份由图题「昭和十三年度」确定"},
            "spatial_error": {"meters": ERR_M if geom else None, "reason": ERR_REASON if geom else "未定位"},
            "geometry_absent_reason": None if geom else "not_located",
            "license_status": "unknown", "claims": claims, "supersedes": [],
            "observed": {"date_from": d0, "date_to": d1, "part_of_day": pod, "as_written": written},
            "derivation": {"method": "place_anchor", "gcp_set_id": None, "note": note},
        },
    })

dataset = {"type": "FeatureCollection",
           "meta": {"schema_version": "0.2.0", "dataset_id": "sam-huanghe1938-fronts-place-anchor",
                    "dataset_revision": "r1-2026-10-24", "region": "cn", "stage": "draft", "synthetic": False,
                    "description": "1938 年新黄河泛滥前锋（地名锚定第一版）。日期取自日军经过要图，位置取注记旁地名的现代坐标，误差约数公里；配准工具完成后由数字化版本取代。"},
           "features": features}
sources = [
    {"source_id": D5, "title": "昭和十三年度ニ於ケル新黄河氾濫經過概況（其一）送付ノ件（附 新黄河氾濫經過要圖 其一・其二）",
     "author_or_org": "杉山部隊本部（北支那方面軍）", "edition": "1939-07-07；JACAR Ref. C04121393700（按标题对应，PDF 内未见编码）",
     "url": None, "source_kind": "original_map", "license_status": "unknown", "accessed": "2026-10-24", "synthetic": False},
    {"source_id": D4, "title": "方軍地資第三十三號 黄河氾濫其後ノ變化ニ就テ 附表・附圖",
     "author_or_org": "北支那方面軍司令部", "edition": "1938-09-25；JACAR Ref. C13032691500（按标题对应，PDF 内未见编码）",
     "url": None, "source_kind": "original_map", "license_status": "unknown", "accessed": "2026-10-24", "synthetic": False},
    {"source_id": WD, "title": "Wikidata（地名条目的 P625 坐标）", "author_or_org": "Wikimedia Foundation / Wikidata contributors",
     "edition": None, "url": "https://www.wikidata.org/", "source_kind": "modern_baseline", "license_status": "cleared",
     "accessed": "2026-10-24", "synthetic": False},
]
os.makedirs(OUT, exist_ok=True)
for name, obj in (("fronts_place_anchor_v1.geojson", dataset), ("fronts_sources.json", sources)):
    p = os.path.join(OUT, name)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(p + ".tmp", p)
located = sum(1 for f in features if f["geometry"])
print(f"features={len(features)} located={located} not_located={len(features) - located} -> {OUT}")
