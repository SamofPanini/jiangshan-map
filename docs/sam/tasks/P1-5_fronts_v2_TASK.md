# 任务单 P1-5｜前锋数据 v2：用 B 图配准结果给日期注记落点

- task_id：`jsm-p1-5-fronts-v2`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex `gpt-6.1-terra` high（新线程）
- 建立：2026-11-09；状态：active
- 路线图位置：`docs/sam/ROADMAP.md` 第 6 项（黄河 P1）

## 0. 开工前必读与禁止事项

1. 仓库根 `AGENTS.md`。
2. `docs/sam/CONTRACT.md`（v0.2.0）和 `scripts/sam/research_contract.js`。
3. `docs/sam/audit/P0b-8_bmap_reading.md`（图例：除 6/15、6/24 两次侦察外，图上是逐日浸水范围）。
4. `docs/sam/audit/P1-4_REPORT.md` 末节「派发方验收与处置」（去重后的精度）。
5. 现有 v1：`data/sam/huanghe1938/fronts_place_anchor_v1.geojson` 和它的生成器 `scripts/sam/tools/build_fronts_1938_place_anchor.py`（照它的字段写法，不另起格式）。
6. 允许：读 `docs/sam/audit/bmap_georef/` 和 `docs/sam/audit/bmap_reads/`；`git status`／`git diff`／`git log`；跑 `node scripts/sam/validate_research.js` 和本单新增的测试。
7. 禁止：`git commit`、切分支、merge、装依赖、联网；读 `js/app.js`；全库扫描；读图像文件（本单只用已有读数）。`python3` 无 numpy。
8. **可写范围（白名单）**：
   - 新建 `scripts/sam/tools/build_fronts_1938_bmap_v2.py`（需要 Node 拟合时可复用 `scripts/sam/tools/bmap_georef.js`，不改它）
   - 新建 `scripts/sam/build_fronts_1938_bmap_v2_test.py`
   - 新建 `data/sam/huanghe1938/fronts_bmap_georef_v2.geojson`
   - 新建 `docs/sam/audit/bmap_georef/gcp_set_bmap-r2-dedup.json`
   - 新建 `docs/sam/audit/P1-5_REPORT.md`
   v1 文件、`fronts_sources.json`、上游文件一律不改。白名单外必须改的地方 ⇒ 不改，写进报告。

## 1. 要做什么

v1 只给 8 个日期里的 3 个落了点，位置借用旁边地名的现代坐标。P1-4 已把 B 图 7 页拼到一起并配准到经纬度。本单用这套配准，把 B 图上**日期注记本身的位置**换算成经纬度，出一份新的研究数据 v2。

注意：这些注记多数**没有箭头**，只是写在某条线旁边（`readings.*.tip_x` 为 null）。所以 v2 的点是「注记所在处」，不是「前锋线上的点」；这一点要写进每个要素的 `derivation.note` 和 `spatial_error.reason`。

## 2. 控制点：先去重，再拟合

P1-4 的 `analysis.json` → `full.controls` 有 40 条观测，只代表 26 个地点（同一地点在多页重复）。重复计入会让留一法偏乐观，所以：

1. 按地点名合并：拼接坐标取各页观测的均值，经纬度取原值（同名经纬度不一致 ⇒ 停机报告）。
2. 写 `gcp_set_bmap-r2-dedup.json`：`gcp_set_id`、来源（P1-4 r2 `analysis.json` 的 sha256）、每点 `name`／`mosaic_x`／`mosaic_y`／`lat`／`lon`／`pages`／`unrefined_gcp`。
3. 用 `tools/sam/georef/georef_core.js` 拟合二次（主）和仿射（对照），算 RMS 和留一法。**数字由程序算出写进报告，不要从本单或 P1-4 报告抄。**
4. 派发方验收时算过一遍，供核对：n=26；二次 RMS 约 3.2 km、留一法中位约 3.0 km、最大约 8.2 km；仿射 RMS 约 3.8 km、留一法中位约 3.3 km。**你的数和这些有出入就照实报，不要去凑。**

## 3. 哪些注记进 v2

数据来源：`candidates.json` 中 `kind` 为 `date` 的条目（62 条），日期写法看 `readings.*.as_written`。

| 类别 | 处理 |
|---|---|
| 12日、13日夕、14日夕、17日夕、18日（含时刻）、19日、25日（含时刻）、25～28日、28日、29日、7月2日、7月8日 | 进 v2，`feature_type: flood_front` |
| 10日・11日旁写「決潰」的（决口事件） | 不进，报告里列为「决口，另议」 |
| 15日、24日（图例：主流侦察） | 不进，列为「侦察，另议」 |
| 7月11日（「増水橋梁流失ス」「擴大ス」） | 不进，列为「7 月 11 日，另议」 |
| p10 上写成「六月十二日」「六月十三日夕」等汉字全写的 | 这是 p12 图例在 p10 右侧露出的部分，**不是地图注记**，不进，列出 |
| 读不出日期（如 p11「□ 12.00」）、三家读法不一致到无法归类的 | 先按第 4 节位置合并，若能与已归类注记合并就随它；否则不进，列出 |

上表没覆盖的写法 ⇒ 不进，列出，不要自己归类。

## 4. 合并与落点

1. **跨页合并**：同一注记会出现在相邻两页。把每条注记的文字中心换到拼接坐标系（用 `analysis.json` 的页变换），日期归一后相同且相距 ≤40 px 的视为同一注记，取均值。40 px 内日期不同、或同日期 40–80 px 的 ⇒ 不合并，列进报告让派发方看。
2. **落点**：三家中至少两家 `has_arrow` 为真且 `tip_unstable` 为假 ⇒ 用箭头端点均值；否则用文字中心。每条注记记下用的是哪一种。
3. **换算**：用第 2 节的二次变换算经纬度；同时用仿射算一遍，记两者距离（米）。
4. **分组成要素**：同一观测时刻一个要素。`segment_id` 用 `front-MMDD`（带时刻的加 `-HHMM`，如 `front-0618-1500`；`25～28日` 用 `front-0625-0628`）。同一时刻多处注记 ⇒ `MultiPoint`；一处 ⇒ `Point`。时刻读法有疑问（如「18.30」三家不一）⇒ 照收，在 `derivation.note` 写明各家读法。
5. **id 不与 v1 重复**：`hh1938-v2-<segment_id>`。

## 5. 字段

照 v1 生成器的写法，以下几项不同：

| 字段 | v2 取值 |
|---|---|
| `meta.dataset_id` | `sam-huanghe1938-fronts-bmap-georef` |
| `meta.dataset_revision` | `r1-2026-11-09`；`stage: draft` |
| `interpretation_id` | `bmap-georef-v2` |
| `evidence_mode` | `reconstructed` |
| `review_state` | `proposed` |
| `derivation` | `method: georef_polynomial`，`gcp_set_id: bmap-r2-dedup`，`note` 写：落点方式（注记中心／箭头端点）、所在页、各家日期读法有分歧时的原文、与仿射结果的距离 |
| `spatial_error.meters` | 机械算出：二次留一法最大值 ＋ 该要素各点仿射—二次距离的最大值；用文字中心落点时再加 50 px 换算成米（注记与所指线的间距，**估计值**）。取整到百米。`reason` 写清这三项各是多少、哪项是估计 |
| `observed` | 与 v1 同规则（单日 `[d, d+1)`；`25～28日` 为 `[06-25, 06-29)`；`part_of_day` 存「夕」或时刻原文） |
| `claims` | 日期：`src-jacar-d5-1939`，`supports: [dating, existence]`，`locator` 写页和像素；几何：同一来源 `supports: [geometry]`，`locator` 写「B 图注记位置经 bmap-r2-dedup 二次配准」；控制点坐标来源：`src-wikidata`，`supports: [geometry]`，`locator` 指向 gcp 文件 |
| `supersedes` | `[]`（这个字段只用于旧水系条目） |

`fronts_sources.json` 里已有这两个来源 ID，不新增来源。

## 6. 校验与测试（必须能失败）

- `node scripts/sam/validate_research.js --data data/sam/huanghe1938/fronts_bmap_georef_v2.geojson --sources data/sam/huanghe1938/fronts_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`：0 错误。贴末行。
- 测试至少包括：
  - 去重后控制点数等于不同地名数；把一条重复观测改成另一个名字，数目随之改变。
  - 第 3 节「不进」的每类各造一条，确认不在输出里，且出现在排除清单里。
  - 跨页同一注记（距离 ≤40 px）合并成一点；人为拉到 60 px ⇒ 不合并并进入「待看」清单。
  - `spatial_error.meters` 等于三项相加（用合成数据算出期望值）。
  - 同输入跑两次，geojson 字节相同。
- 变异自检：去掉第 2 节的去重，确认至少一个测试失败；贴命令和失败输出，再恢复。

## 7. 报告

写 `docs/sam/audit/P1-5_REPORT.md`（中文）：
- 交付物清单；实际命令和末行输出。
- 控制点：去重前后条数；二次与仿射的 RMS、留一法中位与最大（程序算出）。
- 进 v2 的注记表：日期、页、落点方式、经纬度、仿射—二次距离、`spatial_error.meters`。
- 排除清单（按第 3 节类别）和「待看」清单（第 4 节）。
- 与 v1 对照：v1 已落点的 3 个日期（14日夕、17日夕、7月8日），v2 的点与 v1 点相距多少公里。7月8日（太和）在不在 B 图拼接范围内，照实写。
- 本单的数与你实测有出入吗？有就报，不要去凑。

**完工标记**：全部做完且测试通过，最后一行写 `P1-5 DONE`。遇到按本单做不下去的问题，写明原因，最后一行写 `P1-5 BLOCKED`。
