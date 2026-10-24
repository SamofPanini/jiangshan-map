# 任务单 P1-1｜契约 v0.2：点几何、泛滥前锋、观测日期与派生方法；研究图层显示前锋点

- task_id：`jsm-p1-1-contract02`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-24；状态：done（r1 2026-10-24 验收；R3 审核后 r2 返工 2026-10-25 验收，见 `docs/sam/audit/R3_REVIEW.md`）
- 路线图位置：`docs/sam/ROADMAP.md` §6 黄河 P1（第一组逐日前锋点）

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. `docs/sam/CONTRACT.md` 与 `scripts/sam/research_contract.js`（机读正典，本单要改它）。
3. `js/sam/research_layer_core.js`、`js/sam/research_layer.js`、`scripts/sam/research_layer_core.test.js`、`scripts/sam/validate_research.test.js`（都不长，可整份读）。
4. 背景（只读，了解数据从哪来即可）：`docs/sam/audit/P0b-7_flood_timeline_1938.md` §3、§5。
5. **不要读** `js/app.js` 整份（约 400KB）；本单不需要改它。不运行 `git status`／`git diff` 以外的全库扫描；不 commit；不安装依赖。

## 1. 为什么改

1938 年 6 月的日军经过要图逐日标出了泛滥前锋到达的地点（例：「13日夕」在某村旁、「7月2日 光武廟附近ニ達ス」）。要把它们放进研究图层，现行 v0.1.0 有三处放不下：
- 几何只允许线与面，没有点；
- 时间只有年级的 `valid`，没有"哪一天观测到"；
- 没有"前锋"这一要素类型。

另外 v0.1 的 R1-07 裁定写明"派生方法……推迟到契约 v0.2；触发条件是 P0b 出现第一条真实几何"——现在触发了。

## 2. 契约 v0.2.0 的改动（照此实现，不另选方案）

### 2.1 版本兼容（读取方兼容两种，写入方只写新版）

- `meta.schema_version` 接受 `0.1.0` 与 `0.2.0`，其他值仍报 `E_SCHEMA_VERSION`。
- `0.1.0` 文件按现行规则校验，**一个字节的行为都不变**：本单新增的键在 0.1.0 文件里出现 ⇒ `E_UNKNOWN_KEY`；新增的几何类型与要素类型在 0.1.0 文件里出现 ⇒ 分别报 `E_GEOM_TYPE`／`E_ENUM`。
- 导出常量：`SCHEMA_VERSION` 改为 `'0.2.0'`（写入方用），新增 `SUPPORTED_SCHEMA_VERSIONS = ['0.1.0','0.2.0']`。

### 2.2 新增几何类型（仅 0.2.0）

- `Point`：`coordinates` 为一个坐标对；`MultiPoint`：至少一个坐标对，且不得有完全重复的两点（报 `E_LINE` 以外的新码 `E_POINT_DUP`）。
- 坐标规则与现有完全相同（经度在前、有限数、全球范围、区域 bbox、`E_COORD` 优先于 `E_REGION_BBOX`）。

### 2.3 新增要素类型（仅 0.2.0）

- `FEATURE_TYPES` 增加 `flood_front`：**某一观测时刻泛滥水边已到达的位置**（点或线）。它不是泛区范围（那是 `flood_extent`），两者不得互相推导——这句原样写进 CONTRACT.md。

### 2.4 新增两个 properties 键（仅 0.2.0；两个都是**必填键、值可为 null**）

**`observed`**：观测时刻。`null` 或对象，严格键：
| 键 | 规则 |
|---|---|
| `date_from` | `YYYY-MM-DD`，真实存在的公历日期 |
| `date_to` | `YYYY-MM-DD`，**半开区间的右端（不含）**；单日 `d` 写作 `[d, d+1)`。必须 `date_to > date_from` |
| `part_of_day` | string 或 null（原图写法，如 `夕`、`午前`、`15:00`） |
| `as_written` | string：原图上日期的写法（如 `13日夕`、`25～28日`、`九月上旬`） |

规则：
- `feature_type` 为 `flood_front` ⇒ `observed` 必须非 null（新码 `E_OBSERVED`）。
- `date_from` 的年份必须落在该要素 `valid` 的半开区间内（`valid` 端点为 open 时视为无限；为 unknown 时跳过此检查）。违反 ⇒ `E_OBSERVED`。
- 格式错误、非真实日期、`date_to <= date_from` ⇒ `E_OBSERVED`。

**`derivation`**：几何是怎么得来的。`null` 或对象，严格键：
| 键 | 规则 |
|---|---|
| `method` | 枚举 `DERIVATION_METHODS`：`place_anchor`（取图上注记所指地名的现代坐标）、`georef_affine`、`georef_polynomial`（在配准后的原图上数字化）、`digitized_modern`（在现代底图上数字化）、`manual_sketch` |
| `gcp_set_id` | string 或 null；`method` 以 `georef_` 开头时必须为 string（`E_DERIVATION`） |
| `note` | string 或 null |

规则：0.2.0 文件中，`geometry` 非 null 而 `derivation` 为 null ⇒ 警告 `W_NO_DERIVATION`（draft）；release 时升为错误 `E_RELEASE`。

### 2.5 不在本单范围

审核记录（R1-07 里与派生方法一起推迟的那一项）继续推迟：在 CONTRACT.md 写明"推迟到 v0.3，触发条件＝第一个要素由 `proposed` 走到 `accepted`"。

## 3. 研究图层（`research_layer_core.js`／`research_layer.js`）

### 3.1 行为

- 点要素（`Point`／`MultiPoint`）画成小圆点；线、面照旧。
- `flood_front` 要素旁画**日期标签**：取 `observed.as_written`；若有 `part_of_day` 且 `as_written` 里没有它，则补在后面。
- 新增可选 URL 参数 `research_date=YYYY-MM-DD`：带了它时，**只显示 `observed.date_from <= research_date` 的 `flood_front` 要素**（累积显示，便于逐日看前锋推进）；其他类型的要素不受影响。格式不合法 ⇒ 配置错误（与现有错误处理同一路径）。不带时全部显示。
- `<title>` 增加两行：`observed`（写明"半开"）与 `derivation`（method、gcp_set_id、note）。
- 横幅增加一行：本年 `flood_front` 要素数及其 `observed` 日期范围；带 `research_date` 时显示该日期。

### 3.2 纯函数（供测试；胶水层必须调用它们，不得另写一份）

至少新增：`parseResearchDate(search)`、`isFrontVisibleOn(feature, isoDate)`、`frontLabel(feature)`、`pointMarks(geometry, toScreen)`（返回圆心屏幕坐标数组）。

### 3.3 设计意图（Sam：功能不得牺牲 design）

- 研究图层是**叠在原图上的研究标注**，视觉上要能一眼与上游原有要素区分，但不能喧宾夺主：沿用 P0a-3 已有的研究图层配色，不新增第二套主色。
- 前锋点：半径约 3px（随现有缩放机制缩放，不要写死成在大比例尺下变成大圆饼），描边细、填充用研究色的较浅一档；同一年里日期越晚颜色越深（单色梯度，不用彩虹色）。
- 日期标签：字号比上游地名小一档、与上游地名同一字体族；标签放在点的右上方，避免压住点本身；不加底框。点很密时允许标签重叠（v0.2 不做避让），但要在报告里写出重叠最严重的情况。
- 不要动上游的任何样式文件；样式继续由脚本注入的 `<style>` 提供。

## 4. 白名单

| 路径 | 允许的改动 |
|---|---|
| `scripts/sam/research_contract.js` | 按 §2 修改 |
| `scripts/sam/validate_research.js` | 只为支持 §2 所需的最小修改（如打印新警告） |
| `scripts/sam/validate_research.test.js` | 增加测试 |
| `js/sam/research_layer_core.js`、`js/sam/research_layer.js` | 按 §3 修改 |
| `scripts/sam/research_layer_core.test.js` | 增加测试 |
| `docs/sam/CONTRACT.md` | 按 §2 同步（版本、兼容规则、新枚举、新键、新错误码、§2.3 那句"不得互相推导"、§2.5 推迟说明） |
| `scripts/sam/fixtures/research_demo/` | 新增 `demo_fronts_v02.geojson`（见 §6）；**不改**现有两个文件 |
| `docs/sam/audit/P1-1_REPORT.md` | 新建：执行报告 |

`index.html` 与 `js/app.js` **不得改动**（脚本的 `?v=` 缓存参数也不动；主会话验收时会强制刷新）。

## 5. 测试（`node:assert`；每条都要能失败）

1. **0.1.0 行为不变**：现有 `validate_research.test.js` 与 `research_layer_core.test.js` 原样全部通过；现有两个 demo 文件校验结果与改动前逐字相同（报告里贴改动前后的输出对照）。
2. 0.1.0 文件里出现 `observed` ⇒ `E_UNKNOWN_KEY`；出现 `Point` ⇒ `E_GEOM_TYPE`；出现 `flood_front` ⇒ `E_ENUM`。
3. 0.2.0：缺 `observed` 或 `derivation` 键 ⇒ `E_REQUIRED`；`flood_front` 且 `observed: null` ⇒ `E_OBSERVED`。
4. `observed`：`2026-02-30` ⇒ 错；`date_to == date_from` ⇒ 错；单日 `[1938-06-13, 1938-06-14)` ⇒ 通过；`date_from` 为 1938 而 `valid` 为 `[1939,1940)` ⇒ 错。
5. `derivation`：`method: georef_affine` 且 `gcp_set_id: null` ⇒ `E_DERIVATION`；`place_anchor` 且 `gcp_set_id: null` ⇒ 通过；几何非空而 `derivation: null` ⇒ draft 出 `W_NO_DERIVATION`，release 出 `E_RELEASE`。
6. `MultiPoint` 含两个完全相同的点 ⇒ `E_POINT_DUP`；点越出 cn bbox ⇒ `E_REGION_BBOX`；经度为 `NaN` ⇒ 只报 `E_COORD`。
7. `isFrontVisibleOn`：`date_from = 1938-06-13` 的要素在 `1938-06-12` 不可见、`1938-06-13` 可见；非 `flood_front` 要素不受日期参数影响。
8. `parseResearchDate`：`?research_date=1938-6-1`、`1938-13-01` ⇒ 错；不带 ⇒ null；合法 ⇒ 字符串。
9. `frontLabel`：`as_written: '13日夕'`、`part_of_day: '夕'` ⇒ `13日夕`（不重复）；`as_written: '18日'`、`part_of_day: '15:00'` ⇒ `18日 15:00`。

## 6. 演示数据 `demo_fronts_v02.geojson`

- `schema_version: 0.2.0`、`stage: draft`、`synthetic: true`，来源用现有 `demo_sources.json` 里的合成来源（若需新增来源，另建 `demo_fronts_sources.json`，同样 `synthetic: true`）。
- 至少：3 个 `flood_front` 点（`observed` 分别为 1938-06-13、06-19、07-02，`derivation.method: place_anchor`）、1 个 `MultiPoint`、1 个 `observed` 跨多日的要素（`as_written: '25～28日'`、`[06-25, 06-29)`）。
- **坐标必须一眼看出是人造的**（如落在规则网格上，小数点后全为 0 或 5），放在华北平原范围内以便看见，**不得取任何真实地名的坐标**；`description` 写 "synthetic demo for v0.2 point/front mechanics, not historical"。
- 必须通过 `validate_research.js`（附输出）。

## 7. 报告（`docs/sam/audit/P1-1_REPORT.md`）

1. §5 全部测试的真实输出；改动前后 0.1.0 demo 校验输出对照。
2. `validate_research.js` 跑 `demo_fronts_v02.geojson` 的输出。
3. 浏览器内的显示你的环境无法验证 ⇒ 写"待主会话浏览器终验"，列出建议检查的 URL（含与不含 `research_date` 各一条）与预期现象。
4. 「本单里的数与你实测有出入吗？」
5. 你认为 §2 设计有缺陷的地方（尤其半开日期区间、`observed` 年份与 `valid` 的关系），给具体反例，不要擅自换方案。
6. 最后一行：`P1-1 DONE`。

## 8. r2 返工（R3 审核处置；续同一 thread）

R3 审核（Codex 6.1-sol·只读）与主会话处置见 `docs/sam/audit/R3_REVIEW.md` 末节「我方逐条处置」。本节是执行清单；与 §2／§3 冲突处以本节为准。白名单同 §4，另加 `docs/sam/audit/R3_REVIEW.md` **只读**。

| # | 级别 | 要求 |
|---|---|---|
| 1 | BLOCKING | 0.2.0 中 `feature_type: flood_front` 的几何只许 `Point`／`MultiPoint`／`LineString`／`MultiLineString`（以及 `null`＋`geometry_absent_reason`）；其他 ⇒ 新码 `E_GEOM_FEATURE`。0.1.0 行为不变。CONTRACT.md 同步（错误码表＋§2.3 那段） |
| 2 | BLOCKING | 契约层与图层层的「真实公历日期」判定都改为对 0001–9999 年正确（`Date.UTC` 会把 0–99 年当 1900–1999）。测试：`0001-06-13`、`0099-12-31`、`0100-01-01`、`1938-06-13` 受理；`1900-02-29` 拒、`2000-02-29` 受理；`parseResearchDate` 同一组 |
| 3 | BLOCKING | 前锋点半径与日期标签字号要跟上游同一缩放机制：上游 `_rescaleSvgTypography`（`js/app.js` 约 5255 行起，只读该函数前 30 行）按 `s = (1/√z)·移动端系数`、`z = 1000 / camera.w` 反缩放文字。研究图层的点半径（基准 2.8）与标签字号（基准 6.2px）乘同一个 `s`，并在相机变化时随之更新（可仿照现有 `_buildTerrainRivers` 的包装法包装该方法，先调原方法再更新研究图层；`app.js` 仍不得改）。`s` 的计算写成纯函数并测试 z=1、z=10、移动端三例 |
| 4 | COSMETIC | `<title>`：`observed`／`derivation` 为 null 或文件为 0.1.0 时不写这两行 |
| 5 | COSMETIC | CONTRACT.md 导出枚举表补 `SUPPORTED_SCHEMA_VERSIONS` |
| 6 | ADVISORY | 测试补强（每条都要能失败，报告里写你怎么确认它能失败）：① 孤立反例 `[1938-02-30, 1938-03-02)`（valid 1938）⇒ `E_OBSERVED`；② 带 `research_date` 时 `computeVisible` 的结果（拿掉日期筛选必须失败）；③ 胶水层确实用 `parseResearchDate` 的结果（方式自选：抽出可测入口或 DOM 桩） |
| 7 | ADVISORY（改规则） | `observed` 与 `valid` 的关系改为：观测区间整体落在 `valid` 内——`date_from` 的年 ≥ `valid.from`，且 `date_to` ≤ `valid.to` 年的 1 月 1 日。只跳过 unknown／open 的那一端，已知端照查（原文「为 unknown 时跳过此检查」作废）。违反 ⇒ `E_OBSERVED`。CONTRACT.md 同步，测试含 R3 的两个反例 |
| 8 | ADVISORY（改显示） | 横幅改为「本年 flood_front N 个（日期范围 …）」；带 `research_date` 时再加「{date} 可见 M 个」 |

不做：多日区间「其间某日／持续」的区分（R3 5c）推迟到 v0.3。

报告：在 `docs/sam/audit/P1-1_REPORT.md` 末尾追加「## r2」节（不改前文），逐条写改了什么、怎么验的、测试真实输出；浏览器内的缩放效果写「待主会话浏览器终验」并给检查步骤。最后一行改为 `P1-1 r2 DONE`。
