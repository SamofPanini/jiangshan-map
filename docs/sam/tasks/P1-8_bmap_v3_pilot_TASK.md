# 任务单 P1-8｜B 图合成数据 v3（契约 0.3.0）：前锋点＋「14日夕」范围线试点＋决口点

- task_id：`jsm-p1-8-bmap-v3`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex `gpt-6.1-terra` high（新线程）
- 建立：2026-11-10；状态：done（2026-11-10 验收，见 `docs/sam/audit/P1-8_REPORT.md` 末节）
- 路线图位置：`docs/sam/ROADMAP.md` 第 6 项（黄河 P1）
- 依据：Sam 2026-11-09 采纳「决口另建事件点；范围边界存成线；先拿 14日夕 做一个日期的试点」。契约 v0.3 见 P1-7。

## 0. 开工前必读与禁止事项

1. 仓库根 `AGENTS.md`；`docs/sam/CONTRACT.md`（0.3.0）。
2. `docs/sam/tasks/P1-5_fronts_v2_TASK.md` 与 `scripts/sam/tools/build_fronts_1938_bmap_v2.py`（本单复用它的控制点、变换和落点规则，**import 或调用，不复制一份**）。
3. `docs/sam/audit/P1-6_trace_poc.md`（描线读数是怎么来的）。
4. 允许：读 `docs/sam/audit/bmap_georef/`、`docs/sam/audit/trace14/`、`data/sam/huanghe1938/`；`git status`／`git diff`／`git log`；跑 `node scripts/sam/validate_research.js` 与本单测试。
5. 禁止：commit、切分支、装依赖、联网；读 `js/app.js`；全库扫描；读图像文件。不改 v1、v2 数据和 P1-5 生成器（需要它暴露函数而它没有 ⇒ 在报告里说明，用子进程调用它的 CLI 产物代替）。
6. **白名单**：
   - 新建 `scripts/sam/tools/build_huanghe1938_bmap_v3.py`、`scripts/sam/build_huanghe1938_bmap_v3_test.py`
   - 新建 `data/sam/huanghe1938/huanghe1938_bmap_v3.geojson`
   - 新建 `docs/sam/audit/P1-8_REPORT.md`

## 1. 要做什么

研究图层一次只载入一份数据。为了在同一张图上看到逐日前锋、范围边界和决口，本单出一份 0.3.0 的合成数据 v3，含三部分。v1、v2 照旧保留。

### 1.1 前锋点（来自 v2）
- 用 P1-5 生成器的同一输入，重新生成 v2 的 11 个 `flood_front` 要素，放进 v3。几何、`observed`、`spatial_error`、`claims` 与 v2 逐字相同；`id` 前缀改为 `hh1938-v3-`；`interpretation_id` 用 `bmap-georef-v3`。
- 测试断言：v3 的前锋要素去掉 id／interpretation_id 后，与 v2 文件逐字段相同。

### 1.2 「14日夕」范围线（新）
输入：`docs/sam/audit/trace14/`。`jobs.json` 是 6 处注记（`g1`–`g6`，页与像素）；`g?t1.json`／`g?t2.json` 是 `gpt-6.1-terra` 两遍，`g?s1.json` 是 `gpt-6.1-sol` 一遍；每份 `lines[0]` 有 `status` 与页像素 `vertices`。

1. **分级**（派发方已看叠图，以下为裁定，照做）：

| 组 | 来源 | 处理 | `evidence_mode` |
|---|---|---|---|
| g2（寺台雁） | t1、t2、s1 三家 | 进 | `reconstructed` |
| g6（大橋） | t1、s1 两家（t2 在一端偏离，最大 296 px） | 进，只用 t1、s1 | `reconstructed` |
| g1（圃田集）、g3（大井）、g5（白潭） | 只有 s1 描出；派发方叠图目视为实线，未互证 | 进 | `hypothesis` |
| g4（朱仙鎮） | 三家都 `cannot_identify` | 不进，报告列出 | — |

2. **合并多家折线**：两条或三条折线先按弧长各重采样成 20 px 间隔的点列，再按位置对齐取均值。对齐法自定，写进报告；对齐后各家逐点最大距离 >40 px 的段 ⇒ 截掉，不硬平均，报告列出截掉多长。
3. **换算**：页像素 → 拼接坐标（`analysis.json` 的页变换）→ 经纬度（`gcp_set_bmap-r2-dedup.json` 的二次变换，与 P1-5 同一实现）。
4. **要素**：两个 `flood_extent` 要素，按 `evidence_mode` 分：`front-...` 不用，`segment_id` 用 `extent-0614-reconstructed`、`extent-0614-hypothesis`；几何 `MultiLineString`（每组一条线）。
   - `observed`：`[1938-06-14, 1938-06-15)`，`part_of_day: 夕`，`as_written: 14日夕`。
   - `derivation`：`georef_polynomial`，`gcp_set_id: bmap-r2-dedup`，`note` 写每条线来自哪组、哪几家读数、截掉多少。
   - `spatial_error.meters`：二次留一法最大值 ＋ 各线点上仿射与二次距离的最大值 ＋ 描线读数间最大距离（换成米）。`reason` 写清三项。
   - `claims`：日期与存在 → `src-jacar-d5-1939`（locator 写页、注记像素）；几何 → 同一来源（locator：「B 图 14日夕 实线，模型描线，经 bmap-r2-dedup 二次配准」）；控制点 → `src-wikidata`。

### 1.3 决口点（新）
`candidates.json` 中 `kind: date` 的两条：「11日」p06（三家 `has_arrow`，端点约 (580, 531)）和「10日」p06（两家 `has_arrow`，约 (1121, 624)），图上都写「決潰」。
- 两个 `breach` 要素，各一个 `Point`，落点用 P1-5 的箭头端点规则（至少两家有箭头且稳定 ⇒ 端点均值）。
- `observed`：`11日` → `[1938-06-11, 1938-06-12)`，`10日` → `[1938-06-10, 1938-06-11)`；`as_written` 照图上写法（`11日 決潰` 等）。
- `evidence_mode: reconstructed`；`spatial_error` 同 P1-5 箭头端点那种算法。
- `derivation.note` 写：「图上注记的日期；与通行史述（6 月 9 日花园口掘堤）的关系未核，不在本数据里推断」。

### 1.4 公共字段
- `meta.schema_version: 0.3.0`，`dataset_id: sam-huanghe1938-bmap-v3`，`dataset_revision: r1-2026-11-10`，`stage: draft`，`synthetic: false`；`description` 写明三部分和「范围线只有 14日夕 一个日期的试点」。
- 全部 `review_state: proposed`，`supersedes: []`，来源用 `fronts_sources.json`，不新增来源。

## 2. 校验与测试（必须能失败）
- `node scripts/sam/validate_research.js --data data/sam/huanghe1938/huanghe1938_bmap_v3.geojson --sources data/sam/huanghe1938/fronts_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`：0 错误，贴末行。
- 测试至少：§1.1 与 v2 逐字段相同；g4 不在输出里；g6 只用 t1、s1（把 t2 换成和 t1 一样的折线，输出才会变）；对齐后距离 >40 px 的段被截掉（合成数据）；`hypothesis` 与 `reconstructed` 分在两个要素；同输入两次字节相同。
- 变异自检：把 g1/g3/g5 的 `evidence_mode` 改成 `reconstructed`，确认测试失败；贴命令与失败输出，再恢复。

## 3. 报告（`docs/sam/audit/P1-8_REPORT.md`，中文）
- 交付物；命令与末行。
- 每条范围线：来源组、读数家数、点数、长度（km）、截掉段、`spatial_error.meters`。
- 决口两点的经纬度与误差。
- 本单的数与你实测有出入吗？有就报。
- 浏览器显示验不了 ⇒ 写建议 URL（带 `research_date=1938-06-14` 与不带）。

**完工标记**：最后一行写 `P1-8 DONE` 或 `P1-8 BLOCKED`。
