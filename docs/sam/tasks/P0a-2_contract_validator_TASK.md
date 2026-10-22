# 任务单 P0a-2｜研究数据契约 v0.1 与 fail-closed 校验器

- task_id：`jsm-p0a2-contract`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：active
- 路线图位置：`docs/sam/ROADMAP.md` 第 3 项与 §4（只读，不要改）

## 0. 开工前必读

1. 仓库根 `AGENTS.md`（尤其 §3 器械纪律、§4 证据纪律、§5 区域扩展前提）。
2. `docs/sam/ROADMAP.md` 的 §2、§4（用标题行作区间锚，只读这两节）。
3. 本单全文。
4. 不运行 `git status` 以外的全库扫描；不 commit；读大文件用行号区间。
5. 本次在 vault 外运行，vault guard 不在场。**另有一个执行者同时在本仓库做 P0a-1b**（改 `scripts/sam/hydro_inventory*.js`、`docs/sam/audit/coherence_probe.json`、`docs/sam/audit/P0a-1_INVENTORY.md`、新建 `docs/sam/audit/P0a-1b_REPORT.md`）——不要读改这些文件；`docs/sam/audit/hydro_inventory.json` 你可以**只读**（它在那边不会变）。

## 1. 目的

以后所有研究图层数据（先是中国板块，之后日本、欧洲）都要先过这道校验才能被地图读取。本单交付**契约本身＋校验器＋样例**，**不交付任何真实历史数据**，也**不碰 `app.js` 或任何上游文件**。校验器必须是独立的 Node 脚本，与地图前端无关（日本区域包将来要复用）。

## 2. 白名单

只允许新建：

- `scripts/sam/research_contract.js` —— **契约的唯一机读正典**：导出 `SCHEMA_VERSION`、区域表、各枚举、以及纯函数 `validateDataset({ dataset, sources, legacyInventory }) → { errors, warnings }`（不读写文件）
- `scripts/sam/validate_research.js` —— 命令行入口
- `scripts/sam/validate_research.test.js`
- `scripts/sam/fixtures/contract/` 下的样例文件（见 §5）
- `docs/sam/CONTRACT.md` —— 人读说明；开头写明"以 `scripts/sam/research_contract.js` 为准，两者冲突时改本文件"
- `docs/sam/audit/P0a-2_REPORT.md`

只用 Node 内置模块；**不要安装 Ajv 或任何依赖**（JSON Schema 文件本轮不做，避免出现第二份正典）。

## 3. 数据格式 v0.1.0

### 3.1 数据集文件（GeoJSON FeatureCollection）

```json
{
  "type": "FeatureCollection",
  "meta": {
    "schema_version": "0.1.0",
    "dataset_id": "string",
    "dataset_revision": "string",
    "region": "cn",
    "stage": "draft | release",
    "synthetic": true,
    "description": "string"
  },
  "features": [
    {
      "type": "Feature",
      "id": "string（全文件唯一）",
      "geometry": { "type": "LineString | MultiLineString | Polygon | MultiPolygon", "coordinates": [] },
      "properties": {
        "region": "cn",
        "feature_type": "river_course | river_branch | flood_extent | lake | wetland | canal | coastline",
        "waterbody_id": "string",
        "segment_id": "string",
        "interpretation_id": "string",
        "valid": { "from": 1938, "to": 1947, "interval": "half_open", "from_status": "known | open | unknown", "to_status": "known | open | unknown" },
        "original_dating": "string 或 null（原文纪年）",
        "evidence_mode": "attested | reconstructed | schematic | hypothesis",
        "review_state": "proposed | under_review | accepted | rejected | superseded",
        "dating_uncertainty": { "years": "非负数 或 null", "reason": "string 或 null" },
        "spatial_error": { "meters": "非负数 或 null", "reason": "string 或 null" },
        "geometry_absent_reason": "not_located | unknown_extent | restricted 或 null",
        "license_status": "unknown | restricted | cleared",
        "claims": [
          { "claim_id": "string（全文件唯一）", "source_id": "string", "supports": ["geometry | dating | name | existence"], "locator": "string（卷页/图号）" }
        ],
        "supersedes": ["legacy_id（来自 P0a-1 清点）"]
      }
    }
  ]
}
```

### 3.2 来源文件（JSON 数组）

每条：`source_id`（唯一）、`title`、`author_or_org`、`edition`（可 null）、`url`（可 null）、`source_kind`（`original_map | editor_reconstruction | modern_baseline | text | dataset`）、`license_status`（`unknown | restricted | cleared`）、`accessed`（`YYYY-MM-DD` 或 null）、`synthetic`（布尔）。

### 3.3 区域表

`research_contract.js` 里定义 `REGIONS = { cn: { bbox: [70, 15, 140, 56] } }`。**只此一项**；新增区域留给以后的任务单。不要在别处写死 `cn`——区域判断一律查这张表。

## 4. 校验规则与错误码

严格模式：**未列出的键一律报错**（防止字段悄悄分叉）。每条错误输出 `{ code, path, message }`，`path` 用 JSON 指针形式（如 `/features/2/properties/valid/from`）。错误按 `path` 再按 `code` 排序，保证输出确定。

| 错误码 | 何时报 |
|---|---|
| `E_TOP_SHAPE` | 顶层不是 FeatureCollection、`features` 不是数组、`meta` 缺失 |
| `E_SCHEMA_VERSION` | `meta.schema_version` 不等于 `SCHEMA_VERSION` |
| `E_REQUIRED` | 必填键缺失（§3 中所有键都必填；可为 null 的写明了"或 null"） |
| `E_UNKNOWN_KEY` | 出现未定义的键 |
| `E_TYPE` | 值类型不对（如年份不是整数、`supports` 不是数组） |
| `E_ENUM` | 枚举值越界 |
| `E_REGION` | 区域不在 `REGIONS`；或 feature 的 region 与 meta 不同 |
| `E_DUP_ID` | Feature `id` 重复；`claim_id` 重复；来源 `source_id` 重复 |
| `E_INTERVAL` | `interval` 不是 `half_open`；status 为 `known` 时年份缺失或非整数；status 为 `open`/`unknown` 时年份不为 null；出现公元 0 年；两端都 known 时 `from >= to` |
| `E_NULL_REASON` | `dating_uncertainty` 或 `spatial_error` 的数值与 reason 同时为 null；数值为负或非有限数 |
| `E_GEOM_ABSENT` | `geometry` 为 null 但 `geometry_absent_reason` 为 null；或 geometry 非 null 但 absent_reason 非 null |
| `E_GEOM_TYPE` | geometry type 不在允许集合 |
| `E_EMPTY` | 坐标数组为空、Multi 类型零个部件 |
| `E_COORD` | 坐标不是恰好两个有限数；经度不在 [-180,180]、纬度不在 [-90,90] |
| `E_REGION_BBOX` | 坐标落在该区域 bbox 之外 |
| `E_LINE` | LineString（含 Multi 的每个部件）少于 2 点，或有连续重复点 |
| `E_RING` | Polygon 环少于 4 点或首尾不闭合 |
| `E_SELF_INTERSECT` | 同一环内不相邻的边相交 |
| `E_SOURCE_REF` | claim 的 `source_id` 不在来源文件里 |
| `E_LEGACY_REF` | `supersedes` 里的 id 不在传入的 legacy 清点里 |
| `E_RELEASE` | `stage = release` 时以下任一不成立：`meta.synthetic === false`；每个 feature `review_state = accepted`、`license_status = cleared`；被引用的每个来源 `license_status = cleared` 且 `synthetic === false`；每个 feature 至少有一条 claim 支持 `dating`，geometry 非 null 时还要至少一条支持 `geometry` |

警告（不影响退出码）：`W_NO_CLAIMS`（draft 阶段 feature 无 claim）、`W_LICENSE_UNKNOWN`（draft 阶段 license 为 unknown）。

legacy 清点文件必须是 P0a-1 的格式（有 `meta` 与 `entries`，每条有 `legacy_id`）；不是 ⇒ 命令行直接 exit 2，不要当成"零条 legacy"。

## 5. 命令行与样例

- 用法：`node scripts/sam/validate_research.js --data <数据集> --sources <来源> --legacy-inventory <清点>`。三个参数必填、无默认值；缺参、未知参数、文件读不到、JSON 解析失败 ⇒ exit 2。有错误 ⇒ exit 1；无错误 ⇒ exit 0。
- 开口自报一行：三个文件的路径、sha256、feature 数、来源数、legacy 条数、`stage`、`synthetic`。随后逐条打印错误与警告，**不截断**。
- 样例放 `scripts/sam/fixtures/contract/`：
  - `legacy_inventory_min.json`：从 `docs/sam/audit/hydro_inventory.json` **原样复制** 2–3 条 entry（含一条 `name` 为 `Huang` 的 timed 河段）与 `meta`；不得手改 legacy_id。
  - `sources.json`：1–2 条 `synthetic: true` 的来源，title 写明"synthetic fixture source"。
  - `valid_draft.geojson`：`stage: draft`、`synthetic: true`，至少一条 LineString、一条带一个洞的 Polygon、一条 `geometry: null` 的 feature；`supersedes` 引用 `legacy_inventory_min.json` 里的 id。**坐标用明显人为的几何（直线、正方形），落在区域 bbox 内，description 写明"synthetic test geometry, not historical"**——不得描摹任何真实河道。
  - 每个错误码至少一个 `invalid_<错误码小写>.geojson`（`E_SOURCE_REF` 等需要配合来源文件的，可共用 `sources.json`），**每个文件只触发它命名的那一个错误码**。
  - `E_RELEASE` 用 `stage: release` 但 `synthetic: true` 的样例触发即可；**不要造一个"合法的 release 样例"**——那需要真实来源，本轮没有。

## 6. 测试（`node scripts/sam/validate_research.test.js`，用 `node:assert`）

1. `valid_draft.geojson` ⇒ exit 0、errors 为空。
2. 每个 `invalid_*.geojson` ⇒ exit 1，且 errors 的**错误码集合恰好等于** `{该文件命名的错误码}`（多报、少报都算失败）。
3. 用真实的 `docs/sam/audit/hydro_inventory.json` 作 `--legacy-inventory` 跑 `valid_draft.geojson` ⇒ 仍 exit 0（证明样例里的 legacy_id 是真实存在的）。
4. 缺参、未知参数、legacy 文件格式不对 ⇒ exit 2。
5. 同一输入跑两次，stdout 逐字节相同。
6. 对 `research_contract.js` 的纯函数直接调用：把 `valid_draft` 在内存里改一个坐标为 `[200, 35]` ⇒ 恰好得到 `E_COORD`（不连带其他码）。

## 7. `docs/sam/CONTRACT.md` 必须包含

- 字段表、枚举、错误码表（与代码一致；写一个测试或脚本核对两边的错误码集合相同，并在报告附输出）。
- **区间语义换算**：研究数据一律半开 `[from, to)`；旧水系本就是半开；旧交通线 `CORRIDOR_DATA` 是闭区间 `[a, b]` ⇒ 换算为 `[a, b+1)`；`9999` ⇒ `to_status: open`、`to: null`。无公元 0 年：公元前 1 年写 `-1`，下一年是 `1`。
- 证据方式、审核状态、年代不确定性、空间误差四者分开的理由（各一句）。
- "以后再加"清单：Name、Event/Relation、Node/AccessRule/FlowObservation/Scenario 等对象——写明触发条件（见 ROADMAP §4），本轮不实现。

## 8. 验证与报告

报告 `docs/sam/audit/P0a-2_REPORT.md`，三段式，附：

1. 测试全部通过的输出；
2. `node scripts/sam/validate_research.js` 跑 `valid_draft.geojson` 与任意两个 invalid 样例的完整输出；
3. `node scripts/validate_atlas.js` 仍 exit 0；
4. `git status --porcelain` 输出（P0a-1b 执行者的文件照实列出）；
5. 「本单里的数与你实测有出入吗？」；
6. 你认为契约本身有缺陷或自相矛盾的地方（如某两条规则在某种输入上冲突）——**列出并给出反例，不要擅自改契约**；
7. 最后一行：`P0a-2 DONE`。
