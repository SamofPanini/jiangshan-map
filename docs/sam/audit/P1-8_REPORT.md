# P1-8｜B 图 v3 试点

## 交付物清单

- `scripts/sam/tools/build_huanghe1938_bmap_v3.py`：显式输入，调用 P1-5 生成器重新生成前锋，复用其去重、配准应用、距离和误差取整函数；校验给定控制点与实时去重结果相同。
- `scripts/sam/build_huanghe1938_bmap_v3_test.py`：反例与回归测试。
- `data/sam/huanghe1938/huanghe1938_bmap_v3.geojson`：11 个前锋、2 个范围线要素、2 个决口；v1/v2 和 P1-5 生成器未改。数据 SHA256 `3a76b592c2a53601928321f37e03756b089b9b2ded21676bb9fed71273f9ec97`。

## 验证结果（逐项）

- 生成命令：`python3 scripts/sam/tools/build_huanghe1938_bmap_v3.py --analysis docs/sam/audit/bmap_georef/analysis.json --candidates docs/sam/audit/bmap_georef/candidates.json --gcp docs/sam/audit/bmap_georef/gcp_set_bmap-r2-dedup.json --jobs docs/sam/audit/trace14/jobs.json --trace-dir docs/sam/audit/trace14 --v1 data/sam/huanghe1938/fronts_place_anchor_v1.geojson --output data/sam/huanghe1938/huanghe1938_bmap_v3.geojson`；末行 `features=15 loo_max_m=8215.54`。
- `python3 -B scripts/sam/build_huanghe1938_bmap_v3_test.py`：4 项，末行 `OK`。覆盖 v2 逐字段对照、g4 排除、g6 的 t2 不参与、两种分级、合成分歧超 40 px 的裁切、两次字节一致。
- 变异自检：用 Python 临时把生成器 `MODES` 的 g1/g3/g5 三个 `hypothesis` 改成 `reconstructed`，运行 `python3 -B scripts/sam/build_huanghe1938_bmap_v3_test.py`，然后在 `finally` 恢复原文件。输出：`mutation_exit= 1`、`test_modes_and_omission (__main__.Pilot) ... FAIL`、`test_repeat_and_g6_t2_ignored (__main__.Pilot) ... FAIL`、`Ran 4 tests in 0.844s`、`FAILED (failures=2)`。恢复后重跑为 `OK`。
  实际变异命令（引号内换行保留）：

  ```sh
  python3 -B -c 'import pathlib,subprocess,sys; p=pathlib.Path("scripts/sam/tools/build_huanghe1938_bmap_v3.py"); original=p.read_bytes(); changed=original.replace(b"\x27g1\x27:\x27hypothesis\x27,\x27g3\x27:\x27hypothesis\x27,\x27g5\x27:\x27hypothesis\x27",b"\x27g1\x27:\x27reconstructed\x27,\x27g3\x27:\x27reconstructed\x27,\x27g5\x27:\x27reconstructed\x27"); assert changed!=original; p.write_bytes(changed)
  try:
   r=subprocess.run([sys.executable,"-B","scripts/sam/build_huanghe1938_bmap_v3_test.py"],capture_output=True,text=True); print("mutation_exit=",r.returncode); print("\n".join(x for x in r.stderr.splitlines() if "FAIL" in x or "Ran " in x)); assert r.returncode!=0
  finally: p.write_bytes(original)'
  ```
- `node scripts/sam/validate_research.js --data data/sam/huanghe1938/huanghe1938_bmap_v3.geojson --sources data/sam/huanghe1938/fronts_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`：exit 0，0 错误；实际末行 `WARNING W_LICENSE_UNKNOWN /sources/1/license_status draft source license is unknown`。共 17 条许可未知警告。
- `node scripts/validate_atlas.js`：exit 0，`✓ Jiangshan Atlas validation (full) passed in 29465.8 ms:`；实际末行 `  - 110 curated regional/rival regime profiles verified`。

### 范围线与误差

对齐：每条先按弧长 20 px 重采样（保留末点）；以 t1 采样点为基准，在其他重采样折线找最近投影，拒绝端点外推和逆向匹配；对齐位置各家最大两两距离超过 40 px 的点丢弃，不平均；仅接受一个连续、至少两点的保留段，否则停机。下表裁切是基准线长度，包含不具共同覆盖的端部、超阈值及其相邻间隔；不是只计算超阈值长度。单家线直接重采样，无互证距离；误差中的 0 不是实际描线误差为零。每个要素的误差统一采用二次留一最大值、其各线仿射与二次最大差、其各线各家读数最大距离之和，并按 P1-5 取整到百米。

| 组 | 读数 | 输出点 | 长度 km | 裁去基准线 px | 要素误差 m |
|---|---|---:|---:|---:|---:|
| g2 寺台雁 | t1、t2、s1，3 家 | 35 | 30.232 | 33.6 | 12300 |
| g6 大橋 | t1、s1，2 家 | 42 | 38.584 | 136.2 | 12300 |
| g1 圃田集 | s1，1 家 | 34 | 28.379 | 0 | 13600 |
| g3 大井 | s1，1 家 | 20 | 16.595 | 0 | 13600 |
| g5 白潭 | s1，1 家 | 12 | 10.486 | 0 | 13600 |

g4 朱仙鎮三家均 `cannot_identify`，未纳入。

| 决口 | 经度 | 纬度 | 空间误差 m |
|---|---:|---:|---:|
| 10日 決潰 | 113.97756799 | 34.89316889 | 13600 |
| 11日 決潰 | 113.71021674 | 34.89538433 | 14800 |

- 单里给出的数与实测：前锋 11、六组注记、g4 三家拒识、决口箭头分别 2 家和 3 家均相符；g6 t1 顶点到 t2 折线最大距离实测 296.35 px，与约 296 px 相符。任务单未给范围线点数、长度或误差的预期值，以上为实算。
- 浏览器显示未验证，待主会话终验。建议 URL：`http://localhost:8765/?research=data/sam/huanghe1938/huanghe1938_bmap_v3.geojson&research_sources=data/sam/huanghe1938/fronts_sources.json&research_date=1938-06-14`；以及 `http://localhost:8765/?research=data/sam/huanghe1938/huanghe1938_bmap_v3.geojson&research_sources=data/sam/huanghe1938/fronts_sources.json`。

## 规格偏差

任务单 §2 要求 g6 只用 t1、s1，括号却称把 t2 换成与 t1 一样后输出才会变化；后者与前者矛盾。按用户明确要求的 §1.2 裁定，只用 t1、s1，测试把 t2 换成 t1 后断言输出不变；没有实现相反的括号断言。

P1-8 DONE

## 派发方验收与处置（2026-11-10）

- **结论：验收通过，A。** v3（0.3.0）入库：前锋 11、范围线 2（`reconstructed` 2 条，`hypothesis` 3 条）、决口 2，全部 `proposed`。
- 主会话独立核对：测试 OK；浏览器载入 v3，带 `research_date=1938-06-14` 时渲染 15 个元素（12–14 日前锋、两条范围线、两个决口），6/17 以后隐藏，标签正确。面板当时隐藏，没截到图，所以视觉效果未看。
- 几何互证：5 处收入的「14日夕」注记点到各自范围线 1.2–2.5 km，与「注记写在线旁约 50 px（约 2.3 km）」一致；未收的 g4 离最近的线 5.8 km，在预期之中。
- 决口两点：11 日在 113.710E 34.895N，10 日在 113.978E 34.893N。与通行史述的花园口、赵口位置大致相当（差几公里）。数据里不作推断，保留 note。
- 执行者指出 §2 括号里「g6 把 t2 换成和 t1 一样，输出才会变」与 §1.2 矛盾，是派发方笔误；按 §1.2 实现，处理正确。

