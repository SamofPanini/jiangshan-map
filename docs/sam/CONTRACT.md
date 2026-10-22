# 研究数据契约 v0.1.0

以 `scripts/sam/research_contract.js` 为准，两者冲突时改本文件。

本契约只定义可由研究图层读取前验证的数据，不包含真实历史数据；样例中的几何均为合成测试几何，不能作为史料或河道复原。

## 顶层与区域

数据集是 GeoJSON `FeatureCollection`，严格键为 `type`、`meta`、`features`。`meta` 的严格键为 `schema_version`（必须 `0.1.0`）、`dataset_id`、`dataset_revision`、`region`、`stage`（`draft` 或 `release`）、`synthetic`、`description`。区域表的唯一机读位置是 `REGIONS`；当前仅 `cn`，bbox 为 `[70, 15, 140, 56]`。不得在别处把 `cn` 当作有效区域表。

## 机器可读枚举

下表是契约模块导出的全部枚举；测试要求每行的值集合与对应导出完全一致。

| 导出 | 值 |
|---|---|
| `STAGES` | `draft`, `release` |
| `INTERVALS` | `half_open` |
| `ENDPOINT_STATUSES` | `known`, `open`, `unknown` |
| `FEATURE_TYPES` | `river_course`, `river_branch`, `flood_extent`, `lake`, `wetland`, `canal`, `coastline` |
| `EVIDENCE_MODES` | `attested`, `reconstructed`, `schematic`, `hypothesis` |
| `REVIEW_STATES` | `proposed`, `under_review`, `accepted`, `rejected`, `superseded` |
| `LICENSE_STATUSES` | `unknown`, `restricted`, `cleared` |
| `SOURCE_KINDS` | `original_map`, `editor_reconstruction`, `modern_baseline`, `text`, `dataset` |
| `ABSENT_REASONS` | `not_located`, `unknown_extent`, `restricted` |
| `SUPPORTS` | `geometry`, `dating`, `name`, `existence` |
| `GEOMETRY_TYPES` | `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon` |

## Feature 字段表

| 位置 | 必填字段 | 规则 |
|---|---|---|
| Feature | `type`, `id`, `geometry`, `properties` | `type` 为 `Feature`；`id` 全文件唯一。geometry 可为 null。 |
| properties | `region`, `feature_type`, `waterbody_id`, `segment_id`, `interpretation_id` | region 必须与 meta 一致；feature_type 为 `river_course`、`river_branch`、`flood_extent`、`lake`、`wetland`、`canal`、`coastline` 之一。 |
| properties | `valid`, `original_dating`, `evidence_mode`, `review_state` | original_dating 为 string 或 null；evidence_mode 为 `attested`、`reconstructed`、`schematic`、`hypothesis`；review_state 为 `proposed`、`under_review`、`accepted`、`rejected`、`superseded`。 |
| properties | `dating_uncertainty`, `spatial_error`, `geometry_absent_reason`, `license_status` | 两个误差对象均有数值（或 null）和 reason（或 null），但不能同时 null；缺图理由为 null 或 `not_located`、`unknown_extent`、`restricted`；许可为 `unknown`、`restricted`、`cleared`。 |
| properties | `claims`, `supersedes` | claim 有唯一 `claim_id`、`source_id`、`supports`、`locator`；supports 只能为 `geometry`、`dating`、`name`、`existence`。supersedes 的每项必须命中传入 legacy inventory 的 `legacy_id`。 |

geometry 仅支持 `LineString`、`MultiLineString`、`Polygon`、`MultiPolygon`。坐标为经度在前的两项有限数，全球范围为 [-180,180] / [-90,90]，并需在区域 bbox 内。线至少两点且没有连续重复点；面环至少四点、闭合、非相邻边不得相交；Multi 类型不得有零个部件。

来源文件是严格的 JSON 数组。每个来源都有 `source_id`（唯一）、`title`、`author_or_org`、`edition`（string/null）、`url`（string/null）、`source_kind`（`original_map`、`editor_reconstruction`、`modern_baseline`、`text`、`dataset`）、`license_status`、`accessed`（string/null）、`synthetic`（boolean）。

## 时段、证据与发布

研究数据一律使用半开区间 `[from, to)`，`interval` 必为 `half_open`。旧水系本已是半开区间。旧交通线 `CORRIDOR_DATA` 使用闭区间 `[a, b]`，导入时须换算为 `[a, b+1)`；`9999` 换为 `to_status: open` 与 `to: null`。没有公元 0 年：公元前 1 年是 `-1`，下一年是 `1`。known 端点必须是非零整数；open 或 unknown 端点必须为 null。

证据方式描述材料与重建方式，不等于置信度；审核状态描述流程位置；年代不确定性仅表达年代量化误差；空间误差仅表达空间量化误差。四者分别保存，防止把不同含义压缩成一个分数。无量化依据时误差数值为 null、并以 reason 说明原因。

`draft` 中无 claim 是 `W_NO_CLAIMS` 警告，未知许可是 `W_LICENSE_UNKNOWN` 警告。`release` 要求数据集 non-synthetic、每个 feature 为 accepted 且 cleared、每个 feature 有 dating claim、非空几何另有 geometry claim，且所有被引用来源均 cleared 且 non-synthetic。

## R1-07 裁定

- Feature 的 `id` 即 `geometry_id`，不另设 `geometry_id` 字段。
- 已知不存在、未调查、无权限、未加载四态属于覆盖层（数据集级）的显示状态；单个要素的 `geometry_absent_reason` 保持 `not_located`、`unknown_extent`、`restricted` 三值。
- 派生方法与审核记录推迟到契约 v0.2；触发条件是 P0b 出现第一条真实几何。

## 错误优先级

坐标不是有限数或超出 WGS84 全球范围时，报告 `E_COORD`，并跳过该坐标的区域 bbox 检查；因此该坐标不再同时报告 `E_REGION_BBOX`。

## 错误码

| 错误码 | 含义 |
|---|---|
| `E_TOP_SHAPE` | 顶层不是具备 object meta 和 array features 的 FeatureCollection。 |
| `E_SCHEMA_VERSION` | schema_version 不等于契约版本。 |
| `E_REQUIRED` | 缺少必填键。 |
| `E_UNKNOWN_KEY` | 出现严格模式未定义的键。 |
| `E_TYPE` | 值的 JSON 类型不符合要求。 |
| `E_ENUM` | 枚举值越界。 |
| `E_REGION` | 区域未知或 feature region 不匹配。 |
| `E_DUP_ID` | feature、claim 或 source ID 重复。 |
| `E_INTERVAL` | 半开区间或端点状态/年份规则不成立。 |
| `E_NULL_REASON` | 误差数值/reason 同空，或数值为负/非有限。 |
| `E_GEOM_ABSENT` | geometry 与缺图理由不一致。 |
| `E_GEOM_TYPE` | 几何类型未获支持。 |
| `E_EMPTY` | 坐标或 Multi 部件为空。 |
| `E_COORD` | 坐标不是两个有限数或越出全球坐标范围。 |
| `E_REGION_BBOX` | 坐标越出该区域 bbox。 |
| `E_LINE` | 线点数不足或连续重复。 |
| `E_RING` | 面环点数不足或没有闭合。 |
| `E_SELF_INTERSECT` | 面环的非相邻边相交。 |
| `E_SOURCE_REF` | claim 引用不存在的 source_id。 |
| `E_LEGACY_REF` | supersedes 引用不存在的 legacy_id。 |
| `E_RELEASE` | release 限制不满足。 |

## 以后再加

- Name：P1-3 出现名称用例且读取方能定义字段时再加。
- Event / Relation：人物或事件关联被实现时再加。
- Node / AccessRule / FlowObservation / Scenario：T1 出现样本需求时逐对象加入，而非预设空 schema。
