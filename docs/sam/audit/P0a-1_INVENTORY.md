# P0a-1 Hydro and Corridor Inventory

Generated deterministically by `scripts/sam/hydro_inventory.js` from the supplied upstream data bundles.

## Timed hydro entries

| legacy_id | name | rank | interval | geometry |
|---|---|---:|---|---|
| river:Huang:578a13a5f4d1 | Huang | 1 | [-∞, 11) | 1 parts; 10 points; 113.87, 34.85, 117.48, 38.98 |
| river:Huang:8ce628579d2b | Huang | 1 | [11, 1048) | 1 parts; 11 points; 113.87, 34.85, 118.88, 37.82 |
| river:Huang:b97bb865b483 | Huang | 1 | [1048, 1194) | 1 parts; 11 points; 113.87, 34.85, 117.52, 39.06 |
| river:Huang:759cbe42747f | Huang | 3 | [1048, 1194) | 1 parts; 5 points; 115.22, 36.25, 117.82, 37.82 |
| river:Huang:f0981e7773ba | Huang | 1 | [1194, 1855) | 1 parts; 12 points; 113.87, 33.29, 120.22, 34.86 |
| river:Huang:3bc797712c20 | Huang | 3 | [1194, 1580) | 1 parts; 6 points; 114.32, 32.68, 117.76, 34.86 |
| river:Huang:84327c8013cf | Huang | 1 | [1855, ∞) | 2 parts; 24 points; 113.87, 34.85, 119.03, 37.82 |
| river:Ji:e48052811063 | Ji | 3 | [-∞, 1855) | 1 parts; 8 points; 114.85, 35.18, 118.95, 37.72 |
| river:Huai:09946cb0fddb | Huai | 1 | [-∞, 1194) | 1 parts; 8 points; 117.76, 33.03, 120.22, 34.26 |
| river:Si:008c5794bb47 | Si | 3 | [-∞, 1194) | 1 parts; 4 points; 117.16, 33.29, 118.86, 34.22 |
| river:Feihuang:411c124f166e | Feihuang | 4 | [1855, ∞) | 1 parts; 7 points; 117.16, 33.29, 120.22, 34.26 |
| lake:Hongze Hu:68aaac829a28 | Hongze Hu | 1 | [1194, ∞) | 1 parts; 38 points; 117.67, 32.84, 118.75, 33.52 |
| lake:Weishan Hu:db35f1373863 | Weishan Hu | 2 | [1560, ∞) | 1 parts; 4 points; 117.1, 34.46, 117.33, 34.73 |
| lake:Lop Nur:4b517c58f936 | Lop Nur | 2 | [-∞, 1972) | 1 parts; 10 points; 90.02, 39.68, 90.9, 40.52 |
| lake:Juye Ze:8dfb5a5c82d8 | Juye Ze | 2 | [-∞, 1280) | 1 parts; 9 points; 115.72, 35.36, 116.42, 35.86 |
| lake:Yunmeng Ze:370978e5de05 | Yunmeng Ze | 2 | [-∞, 317) | 1 parts; 9 points; 112.38, 29.88, 113.56, 30.45 |
| label:蒲昌海·罗布泊:15a4fad7b0b0 | 蒲昌海·罗布泊 / Lop Nur (Puchanghai) |  | [-∞, 1972) | coord 90.48, 40.08 |
| label:河水（禹贡故道）:95d5fc59fce8 | 河水（禹贡故道） / Yellow R. (Yugong Course) |  | [-∞, 11) | coord 115.65, 37.35 |
| label:黄 河（王景故道）:5b192f987075 | 黄 河（王景故道） / Yellow R. (Wang Jing Course) |  | [11, 1048) | coord 116.55, 36.62 |
| label:黄 河（北宋北流）:ce0588e08a22 | 黄 河（北宋北流） / Yellow R. (Song N. Course) |  | [1048, 1194) | coord 116.05, 37.55 |
| label:黄 河（夺淮故道）:5391aff5bc09 | 黄 河（夺淮故道） / Yellow R. (Huai Course) |  | [1194, 1855) | coord 117.55, 34.18 |
| label:黄 河:1d17e603e785 | 黄 河 / Yellow R. |  | [1855, ∞) | coord 116.35, 36.28 |
| label:济 水:cd85cc02ed1b | 济 水 / Ji R. |  | [-∞, 1048) | coord 117.35, 36.85 |
| label:大清河:7870606d59b1 | 大清河 / Daqing R. |  | [1048, 1855) | coord 117.35, 36.85 |
| label:洪泽:abe4d8ce8a0c | 洪泽 / Hongze L. |  | [1194, ∞) | coord 118.52, 33.32 |
| label:巨野泽:c26d59ce785f | 巨野泽 / Juye Marsh |  | [-∞, 900) | coord 116.08, 35.62 |
| label:梁山泊:e8219459c192 | 梁山泊 / Liangshan Marsh |  | [900, 1280) | coord 116.08, 35.62 |
| label:云梦泽:4289bb370a73 | 云梦泽 / Yunmeng Marsh |  | [-∞, 317) | coord 112.98, 30.18 |

## Static entries by kind and rank

| kind | rank | count |
|---|---:|---:|
| label | null | 29 |
| lake | 1 | 6 |
| lake | 2 | 15 |
| lake | 3 | 8 |
| lake | 4 | 5 |
| lake | 5 | 15 |
| lake | 6 | 8 |
| river | 1 | 12 |
| river | 2 | 25 |
| river | 3 | 46 |
| river | 4 | 1 |
| river | 5 | 30 |
| river | 6 | 17 |
| river | 7 | 45 |

## Corridors

| key | kind | title | span | segments | points | bbox |
|---|---|---|---|---:|---:|---|
| wall_zhanguo | wall | 战国长城（秦·赵·燕北长城） | [-300, -215] | 3 | 18 | 103.9, 35.4, 123.6, 42.2 |
| wall_qin | wall | 秦长城 | [-214, -122] | 1 | 22 | 103.9, 35.4, 125.3, 42.3 |
| wall_han | wall | 汉长城 | [-121, 220] | 1 | 22 | 103.9, 35.4, 125.3, 42.3 |
| wall_han_hexi | wall | 汉长城（河西段） | [-111, 220] | 1 | 14 | 90.8, 35.4, 103.9, 40.7 |
| wall_ming | wall | 明长城 | [1368, 9999] | 1 | 27 | 98.2, 37.2, 119.8, 41.1 |
| wall_ming_liaodong | wall | 辽东边墙 | [1442, 1644] | 1 | 10 | 119.8, 40, 124.6, 42.6 |
| zhidao | road | 秦直道 | [-212, 220] | 1 | 9 | 108.6, 34.5, 109.9, 40.5 |
| silk_hexi | road | 丝绸之路·河西道 | [-121, 1400] | 1 | 16 | 93.9, 34.34, 108.94, 40.5 |
| silk_north | road | 丝绸之路·天山南路 | [-60, 1400] | 1 | 18 | 67, 39.47, 93.9, 43.1 |
| silk_south | road | 丝绸之路·昆仑北路 | [-100, 1000] | 1 | 13 | 75.98, 37.11, 93.9, 40.5 |
| canal_tongji | canal | 隋唐大运河·通济渠 | [605, 1292] | 1 | 10 | 112.45, 33.1, 119.02, 34.85 |
| canal_hangou | canal | 邗沟 · 江南河 | [605, 1292] | 1 | 9 | 119.02, 30.27, 120.75, 33.6 |
| canal_yongji | canal | 隋唐大运河·永济渠 | [608, 1292] | 1 | 11 | 113.4, 34.9, 117.2, 39.9 |
| canal_jinghang | canal | 京杭大运河 | [1293, 9999] | 1 | 18 | 115.7, 30.27, 120.75, 39.9 |
| sea_silk | sea | 海上丝绸之路 | [618, 1433] | 1 | 14 | 102.25, 2.2, 118.6, 24.9 |
| zhenghe | sea | 郑和下西洋航线 | [1405, 1433] | 1 | 20 | 102.25, 2.2, 122, 32.1 |

## Coherence probe counts and samples

- Boundary years: 33
- Corridor-to-hydro boundary matches: 30
- Timed label pairing records: 12; unpaired labels: 0
- Huang visibility probe years: 63

### Boundary-year sample (first 10)

- -300: wall_zhanguo
- -215: wall_zhanguo
- -214: wall_qin
- -212: zhidao
- -122: wall_qin
- -121: silk_hexi, wall_han
- -111: wall_han_hexi
- -100: silk_south
- -60: silk_north
- 11: label:河水（禹贡故道）:95d5fc59fce8, label:黄 河（王景故道）:5b192f987075, river:Huang:578a13a5f4d1, river:Huang:8ce628579d2b

### Corridor-to-hydro match sample (first 10)

- wall_han / river:Huang:578a13a5f4d1 / vanish=11
- wall_han / river:Huang:8ce628579d2b / appear=11
- wall_ming / river:Huang:84327c8013cf / appear=1855
- wall_ming / river:Ji:e48052811063 / vanish=1855
- canal_tongji / river:Huang:8ce628579d2b / vanish=1048
- canal_tongji / river:Huang:b97bb865b483 / appear=1048
- canal_tongji / lake:Hongze Hu:68aaac829a28 / appear=1194
- canal_tongji / river:Huai:09946cb0fddb / vanish=1194
- canal_tongji / river:Huang:3bc797712c20 / appear=1194
- canal_tongji / river:Huang:b97bb865b483 / vanish=1194

### Timed-label pairing sample (first 10)

- label:蒲昌海·罗布泊:15a4fad7b0b0: lake:Lop Nur:4b517c58f936
- label:河水（禹贡故道）:95d5fc59fce8: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063
- label:黄 河（王景故道）:5b192f987075: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063, river:Jing:1cf30e1658f7
- label:黄 河（北宋北流）:ce0588e08a22: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063, river:Song’acha:b7ed7715501f
- label:黄 河（夺淮故道）:5391aff5bc09: river:Feihuang:411c124f166e, river:Huai:09946cb0fddb, river:Huai:41ea7d48299a, river:Huai:9160decb9731, river:Huai:c45450a9f014, river:Huang:3bc797712c20, river:Huang:f0981e7773ba, river:Si:008c5794bb47
- label:黄 河:1d17e603e785: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063
- label:济 水:cd85cc02ed1b: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063
- label:大清河:7870606d59b1: river:Huang:578a13a5f4d1, river:Huang:759cbe42747f, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063
- label:洪泽:abe4d8ce8a0c: lake:Hongze Hu:68aaac829a28, lake:Khövsgöl Nuur:66c4a3a40024, river:Feihuang:411c124f166e, river:Huai:09946cb0fddb, river:Huang:f0981e7773ba, river:Si:008c5794bb47
- label:巨野泽:c26d59ce785f: lake:Juye Ze:8dfb5a5c82d8, river:Huang:578a13a5f4d1, river:Huang:84327c8013cf, river:Huang:8ce628579d2b, river:Huang:b97bb865b483, river:Ji:e48052811063

## Interval semantics

Hydro visibility is half-open `[appear, vanish)`: an item vanishing in year `y` is not visible in `y`. Corridor visibility is closed `[span[0], span[1]]`: a corridor remains visible at both endpoints.
