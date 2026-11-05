# 研究实体契约 profile `research_entities` 0.1.0（R1 草案）

> 状态：**草案，未实现**。只有文档和合成样例，还没有校验器；校验器排在 R2，也就是 P1 第 6 项通过之后（ROADMAP §1，2026-11-05 裁定）。
> 和 [CONTRACT.md](./CONTRACT.md)（水系 Feature 契约 v0.2.0）是两个独立版本号。二者**共享**的规则写在 §1，本文件不重复定义；冲突时以 CONTRACT.md 的共享规则为准。
> 背景与理由见 [RELIGION_LAYER_PLAN.md](./RELIGION_LAYER_PLAN.md) §2、§3.1。样例在 `scripts/sam/fixtures/research_entities/`，全部是**合成数据**（`synthetic: true`），机构名、人名、年代都是虚构的，不是史料。
> **前置条件未满足**：还没有对照 `Japan-s-Temple-v2/docs/CONTRACT.md` 原文（本会话没有读取权限）。§9 的对照表依据的是 Notion 上的摘要，冻结前要逐键核对。

## 0｜适用范围

- 适用对象：有身份连续性、名称史、迁址史、隶属史的**机构**，以及围绕它们的人物、派系、事件、关系。第一个读取方是寺观层（试点：南宋临安五山）；结构上也能承载书院、会馆、衙署这类机构，但现在不为它们预设枚举。
- 不适用：水体几何。水体几何仍归 Feature 契约。

## 1｜从 CONTRACT.md 继承的规则（不改语义）

| 规则 | 来源 |
|---|---|
| 时间区间对象 `valid = {from, from_status, to, to_status, interval}`：半开区间 `[from, to)`，`interval` 必为 `half_open`；`from_status`/`to_status` 取 `known`/`open`/`unknown`，状态为 `open` 或 `unknown` 时对应端点值为 null；没有公元 0 年 | CONTRACT「时段」节 |
| `original_dating`：原文纪年用字符串保存（年号、干支、「嘉定间」之类），可为 null | 同上 |
| `evidence_mode` 四值 `attested`/`reconstructed`/`schematic`/`hypothesis`；`review_state` 五值 `proposed`/`under_review`/`accepted`/`rejected`/`superseded`；两者分开 | CONTRACT 枚举 |
| `dating_uncertainty`、`spatial_error`：都是 `{value, reason}`，数值与原因不能同时为 null；**不设任何综合置信度** | CONTRACT／AGENTS §4 |
| `region` 必填，取值在 `REGIONS` 中（目前只有 `cn`）；坐标为 WGS84、经度在前，且须落在区域 bbox 内 | CONTRACT「顶层与区域」 |
| `stage`：`draft`/`release`；release 的要求同 CONTRACT（非合成数据、accepted、许可 cleared 等） | CONTRACT「发布」 |
| 几何规则（Point/Line/Polygon 校验、错误优先级） | CONTRACT 几何节 |
| 严格键：未定义的键报错 | CONTRACT |

## 2｜顶层结构

一个数据集就是一个 JSON 对象，严格键如下：

```
{ "meta": {...}, "sources": [...], "schools": [...], "institutions": [...],
  "sites": FeatureCollection, "persons": [...], "events": [...],
  "claims": [...], "rank_sets": [...], "identity_candidates": [...] }
```

`meta` 的严格键：`profile`（固定为 `research_entities`）、`profile_version`（`0.1.0`）、`dataset_id`、`dataset_revision`、`region`、`stage`、`synthetic`、`description`、`vocabularies`（引用的区域词表 ID 列表，见 §7）。

任一数组都可以为空，但键本身必须存在。

## 3｜ID 规则

- 格式：`<前缀>:<region>-<本地串>`，例如 `inst:cn-hz0001`。本地串只能由 `[a-z0-9_-]` 组成。**ID 中不得出现名称**，因为名称不是主键。
- 前缀：`src` 来源｜`sch` 派系｜`inst` 机构｜`site` 地点｜`per` 人物｜`evt` 事件｜`clm` 主张｜`rks` 等级名单｜`idc` 身份候选。
- 全文件唯一。被引用的 ID 必须存在于本文件，或以 `ext:` 外键形式出现（§6）。
- 和 Japan-s-Temple 的对应关系见 §9。由于 region 写进了 ID，两个区域的数据放到同一张图上也不会撞号。

## 4｜对象

### 4.1 Source（来源，也就是一份证人）

在 CONTRACT 的 Source 基础上**扩展**（这是 profile 自己的 Source 类型，不回写水系 Source）：

| 键 | 规则 |
|---|---|
| `source_id`, `title`, `author_or_org`, `edition`, `url`, `accessed`, `synthetic` | 同 CONTRACT |
| `witness_genre` | 材料体裁：`gazetteer_local`（方志）、`gazetteer_monastic`（寺观志）、`lamp_record`（灯录）、`recorded_sayings`（语录）、`inscription`（碑刻／塔铭）、`edict`（敕牒／诏令）、`biography`、`catalogue_modern`（现代目录／权威库）、`modern_study`（现代研究）、`modern_map_data`（Wikidata/OSM 等）、`dataset`。**和 `evidence_mode` 不是一回事**：体裁说明材料是什么，`evidence_mode` 说明某条主张是怎么论证出来的 |
| `work_date` | 作品成书（或刻石）时间，用区间对象；未知时用 unknown 端点 |
| `edition_date` | 所用版本的刊刻或出版时间，区间对象或 null |
| `license_metadata` / `license_transcription` / `license_scan` | 三栏分开，各取 `unknown`/`restricted`/`cleared`。**不得由站点的总括声明推定任何一栏**（例如 fosizhi 影印 JPEG 的 `license_scan` 设为 `unknown`） |
| `license_note` | 字符串，原样记下许可依据（例如 CBETA XML 头的那句 availability 声明） |
| `cites` | 来源转引链：本来源转引的其他 `source_id` 列表，可为空。例如明清寺志转引宋碑，就把宋碑记为一个独立 Source 放进这里 |

### 4.2 School（派系节点）

| 键 | 规则 |
|---|---|
| `id` | `sch:` |
| `tradition` | `buddhist`/`daoist`/`other`，单值。派系节点只属于一个传统；**机构**才可能横跨多个传统 |
| `names` | 名称段数组，见 §4.8 |
| `label_basis` | `self_identification`（自称）/`contemporary_external`（同时代他称）/`retrospective`（后世史学分类）。例如「五家七宗」这一框架、「虎丘派」这一标签都要标明属于哪一种 |

派系与派系之间的关系不写在节点上，一律用 claim 表达（§5）。

### 4.3 Institution（机构）

| 键 | 规则 |
|---|---|
| `id` | `inst:` |
| `names` | 名称段数组（§4.8）；**至少一段** |
| `kind_note` | 字符串或 null，用来记原文自称（寺、院、庵、观、宫……）。这里不设枚举，等试点数据出来后再定 |
| `existence` | 区间对象：机构存续的时段 |

宗教属性、宗属、等级、住持制度（子孙／十方）、所在地点，**都不是机构的字段**，一律写成有时效的 claim。这样同一机构就可以同时属于多个传统，或在不同时段先后属于不同传统。

### 4.4 Site（地点）

`sites` 是 GeoJSON FeatureCollection，每个 Feature 的 `id` 用 `site:` 前缀。`geometry` 可以是 null。properties 的严格键如下：

| 键 | 规则 |
|---|---|
| `region` | 同 CONTRACT |
| `text_location` | 原文写的位置，原样保存，例如「某山之南」「距县治三十里」；可为 null |
| `anchor` | null，或 `{anchor_id, relation, distance_text, direction_text}`。`anchor_id` 指向另一个 `site:`，或一个外键（如 CHGIS 治所）；`relation` 取 `within`/`adjacent`/`distance_direction`/`relative_other` |
| `precision_class` | `exact_site`、`relative_site`（只知道相对另一处的位置）、`mountain_or_valley`（某山某坞级）、`county`、`unknown` |
| `coordinate_status` | `precise`、`estimated`、`to_be_verified`、`none`。geometry 为 null 时必须是 `none` |
| `original_crs` | 原始坐标系字符串（例如 `GRS67`），或 null。转换方法写在 `derivation.note` |
| `derivation` | 同 CONTRACT v0.2 的 derivation 对象；有 geometry 时必填 |
| `spatial_error` | 同 CONTRACT |
| `geometry_absent_reason` | 同 CONTRACT 三值；geometry 为 null 时必填 |
| `modern_candidate` | 布尔值。**`true` 表示这个点只是现代位置候选（Wikidata/OSM/现代地图），禁止被任何 `located_at` claim 用于早于 1900 年的时段**（§8 R-07） |

机构和地点的关联写成 claim：`inst —located_at→ site`，并带时段。

### 4.5 Person（人物）

| 键 | 规则 |
|---|---|
| `id` | `per:` |
| `names` | 名称段数组；`name_type` 要区分法名、字号、俗名 |
| `life` | 区间对象，可两端都为 unknown |
| `external_ids` | 外键数组（§6），例如 `ext:cbdb:12345@BJ20260602`、`ext:dila_person:A000123` |

外部权威库的合并结果**不能当作同一性的证据**。两个 `per:` 是否同一人，只能通过 `idc:` 判断。

### 4.6 Event（事件）

| 键 | 规则 |
|---|---|
| `id` | `evt:` |
| `event_type` | 共享层枚举：`founded`、`renamed`、`name_granted`（敕额／赐额）、`relocated`、`destroyed`、`rebuilt`、`merged`、`converted`（改宗或改传统，如改律为禅、改寺为观）、`tenure_changed`（子孙改十方等）、`abolished`。区域特有的细分放在区域词表 |
| `participants` | 数组 `[{role, ref}]`。`role` 取 `institution`/`issuer`/`agent`/`from_school`/`to_school`/`from_site`/`to_site`；`ref` 是 ID 或外键 |
| `when` | 区间对象，加 `original_dating` |

事件本身不承载证据。证据来自一条 `claim`，形式为 `evt —attested_by→ ...`，见 §5 末。事件也**不覆写**机构的字段：赐额事件发生后，新名称要另写一段名称，并在该名称段的 `name_event` 里引用这个事件。

### 4.7 RankSet（等级名单）

等级名单（如五山十刹）作为**整组断言**保存，不拆成孤立的单条边。这样不同来源给出的名单可以并存、互相比较：

| 键 | 规则 |
|---|---|
| `id` | `rks:` |
| `system` | 区域词表中的等级体系 ID，例如 `cn:wushan_chan`、`cn:wushan_jiao` |
| `members` | 有序数组 `[{tier, position, ref, name_as_written}]`。`tier` 取值如 `mountain`/`monastery`，由区域词表定义；`position` 可为 null，表示原文无序；`ref` 可以是 `inst:` 或 null（null 表示还没对齐到机构，但原文写法保留在 `name_as_written`） |
| `asserted_period` | **原文所称的时期**，区间对象加 `original_dating`，例如「嘉定间」 |
| `source_id`, `locator`, `source_date_note` | 来源和定位。`source_date_note` 说明来源年代晚于所称时期的情况，例如「明人追述」 |
| `evidence_mode`, `review_state` | 同 CONTRACT |

如果要单独查询「某机构某时段属于某等级」，由读取方从 RankSet 派生出来，**不另外写一份**。

### 4.8 名称段（嵌在 School / Institution / Person 内）

```
{ "name": "…", "name_type": "full|short|common|granted|dharma|courtesy|secular|other",
  "lang": "lzh|zh|ja|…", "valid": <区间对象>, "original_dating": …,
  "name_event": "evt:…" | null, "claim_ids": ["clm:…"] }
```

- 每段名称至少要有一条 claim 支撑（draft 阶段缺了报警告，release 阶段报错）。
- 同一机构名称段的有效时段**允许重叠**，因为全称、简称、俗称可以同时通行。

## 5｜Claim（主张）与谓词

所有关系和有时效的属性，都写成 `claims` 里的对象：

| 键 | 规则 |
|---|---|
| `claim_id` | `clm:` |
| `subject`, `predicate`, `object` | `object` 是 ID、外键或字面值（字面值是否允许由谓词决定） |
| `valid` | 区间对象：**所称关系成立的时段** |
| `original_dating` | 原文纪年 |
| `source_id`, `locator` | 必填。`locator` 是严格对象 `{juan, page, column, line, frame, note}`，各项都是 string 或 null，但至少要有一项非 null。CBETA 写成 `page: "0260", column: "b", line: "03"`，同时在 `note` 里保留完整行首标记，如 `T51n2076_p0260b03` |
| `quote` | 字符串或 null。**只允许 ≤40 字、并且来源的 `license_transcription` 为 `cleared` 或底本是公有领域古籍时填写**；其他情况只写 locator（AGENTS §7：不转载） |
| `source_later_than_claim` | 布尔值：来源成书年代是否晚于所称时期。由写入方判断后填写，校验器会用 Source 的 `work_date` 复核（§8 R-10） |
| `evidence_mode`, `review_state`, `dating_uncertainty` | 同 CONTRACT |
| `negated` | 布尔值。`true` 表示「来源明确否认」，例如原文说「律院不在五山十刹之列」 |
| `note` | 字符串或 null |

### 5.1 谓词表（共享层）

| 谓词 | 主语 → 宾语 | 证据门槛与禁止推导 |
|---|---|---|
| `located_at` | inst → site | 来源必须直接写明位置；`modern_candidate` 的 site 只能用于 ≥1900 的时段 |
| `affiliated_with` | inst → sch | **只有直接记载**（敕令、碑记、志书明确写「本寺为某宗」）才能标 `attested`。由住持法脉推出的宗属只能标 `hypothesis`，并在 `note` 里写出推导链。同宗的两所机构之间不生成任何边 |
| `religious_tradition` | inst → 字面值 `buddhist`/`daoist`/`other` | 有时效、可以多值并存，用来表达三教合一和佛道共祀 |
| `tenure_type` | inst → 区域词表值（cn：`hereditary` 甲乙／子孙、`public` 十方、`mixed`） | 有时效 |
| `subordinate_to` | inst → inst | 制度性隶属。区域词表把 `cn:xiayuan_of`（下院）和 `jp:honmatsu`（本末）登记为它的子谓词。**两个子谓词之间不能互相推导** |
| `title_claim` | inst → 区域词表值（如 `cn:zuting` 祖庭） | 称号本身有成立史，`valid` 只能从来源能证明的时点开始 |
| `abbot_of` | per → inst | 有时效 |
| `founder_of` | per → inst | 常常是后世追认，必须填 `source_later_than_claim` |
| `resided_or_studied_at` | per → inst | 只表示游方、参学、居留，**不能升级为传法** |
| `tonsured_by` | per → per | 剃度 |
| `ordained_by` | per → per | 受戒、传戒、授箓，具体类别写在 `note` |
| `studied_under` | per → per | 参学、问法 |
| `entered_chamber_of` | per → per | 入室 |
| `dharma_heir_of` | per → per | **嗣法**。来自灯录的一律记为灯录作者的断言，`evidence_mode` 不高于 `reconstructed`，除非有同时代的印可文书或塔铭支持。和上面四种师承关系互不推导 |
| `part_of` | sch → sch | 有时效；分类框架属于后世建构时标 `reconstructed` |
| `historical_name_of` | sch → sch | 多对多 |
| `lineage_successor_of` | sch → sch | 法脉意义上的承续 |
| `legal_successor_of` | sch → sch | 组织或法律意义上的承续，大多只适用于近代 |
| `attested_by` | 任意对象（inst/sch/per/evt）→ 字面值 `true` | 「存在／名称／事件」的证据载体，`source_id`/`locator` 写在这条 claim 上；名称段 `claim_ids` 指向这类 claim |

区域词表可以新增**子谓词**，但不能新增顶层谓词。新增顶层谓词需要升级 profile 版本。

## 6｜外键

外键格式为 `ext:<namespace>:<id>[@<release>]`。`namespace` 先登记以下几个：`cbdb`、`dila_person`、`dila_place`、`chgis`、`wikidata`、`osm`、`jp_temple`（Japan-s-Temple 的 ID）。规则：

- `cbdb` 必须带 `@release`，例如 `@BJ20260602`（CBDB 许可分层，见 RELIGION_LAYER_PLAN §3.1）。
- 外键只表示「候选对应」，**不承载证据**。`claim.source_id` 不能是外键。

## 7｜区域词表

- 位置：`vocab/<region>.json`，作为 profile 的附件。R1 只登记**结构**，不写入中国或日本的具体条目，具体条目等 R2 随试点一起写。
- 内容：等级体系（`system` 及其 `tier` 取值）、`tenure_type` 取值、子谓词（父谓词＋定义＋「不可与哪些谓词互推」）、`title_claim` 取值、事件细分类型。
- 共享层不出现「朝代」「敕额」「五山」「本末」这类词（AGENTS §5）。

## 8｜校验规则（R2 实现时的规格；错误码前缀 `RE_`）

| # | 规则 | 错误码 |
|---|---|---|
| R-01 | 顶层或对象的严格键；`meta.profile` 和 `meta.profile_version` 必须匹配 | `RE_SHAPE` / `RE_UNKNOWN_KEY` |
| R-02 | ID 格式、前缀与对象类型一致、region 段与 `meta.region` 一致、全文件唯一 | `RE_ID` / `RE_DUP_ID` |
| R-03 | 引用断裂：claim、事件参与者、名称段 `name_event`、RankSet 成员、`cites` 指向不存在的 ID | `RE_REF` |
| R-04 | 谓词不在表内，或主语／宾语类型与谓词定义不符 | `RE_PREDICATE` |
| R-05 | 区间对象不合法（规则继承 CONTRACT 的 `E_INTERVAL`） | `RE_INTERVAL` |
| R-06 | `locator` 全部为 null、claim 没有 `source_id`、`source_id` 写成外键 | `RE_LOCATOR` / `RE_SOURCE` |
| R-07 | 用 `modern_candidate: true` 的 site 支撑 `located_at`，而 claim 的 `valid` 早于 1900 | `RE_MODERN_BACKFILL` |
| R-08 | `dharma_heir_of` 的来源体裁为 `lamp_record`，但 `evidence_mode` 标成了 `attested`（由 Source 的 `witness_genre` 判断；有同时代印可文书或塔铭支持时，应另写 claim，来源体裁为 inscription 或 edict） | `RE_EVIDENCE_GATE` |
| R-09 | `affiliated_with` 标为 `attested`，但来源体裁是 `catalogue_modern` 或 `modern_map_data` | `RE_EVIDENCE_GATE` |
| R-10 | `source_later_than_claim` 与 Source `work_date` 所示年代矛盾（只在两边都是 known 时检查） | `RE_SOURCE_DATE` |
| R-11 | `quote` 超过 40 字，或来源的 `license_transcription` 不是 `cleared` 却填了 quote | `RE_QUOTE` |
| R-12 | site 的 geometry、`coordinate_status`、`geometry_absent_reason` 三者不一致 | `RE_SITE` |
| R-13 | 机构没有名称段；名称段没有 claim（draft 报警告 `RW_NAME_NO_CLAIM`，release 报错） | `RE_NAME` |
| R-14 | 身份候选（`idc:`）状态为 accepted，但两个对象仍然分立且没有 `merged_into`（见 §8.1） | `RE_IDENTITY` |
| R-15 | 两个机构有同名名称段，但两者之间没有任何 idc（`rejected` 的 idc 也算已核过）：只报警告 `RW_SAME_NAME`，**不自动合并** | `RW_SAME_NAME` |
| R-16 | release 阶段：Source 的三栏许可任一为 `unknown`，且数据集包含引用该来源的 quote 或影像派生几何 | `RE_RELEASE` |

### 8.1 IdentityCandidate（身份候选）

```
{ "id": "idc:…", "a": "inst:…", "b": "inst:…", "basis": ["same_name","same_site","name_event_chain","external_id"],
  "status": "proposed|accepted|rejected", "merged_into": "inst:…" | null, "note": "…", "claim_ids": ["clm:…"] }
```

`basis` 只记录「为什么怀疑两者是同一个」，**任何一种 basis 都不会自动触发合并**。`accepted` 由主会话裁定，裁定后必须填 `merged_into`。

## 9｜与 Japan-s-Temple-v2 的对照（⚠ 依据 Notion 摘要，待对照原文）

| 本 profile | Japan-s-Temple（据 Notion） | 状态 |
|---|---|---|
| `inst:` | `tmp:` | 对应；前缀不同，靠 region 段避免碰撞。是否统一前缀待议 |
| `site:` | `site:` | 同名 |
| `sch:` | `den:` | 对应 |
| `claims` + `predicate` | RelationClaim | 结构对应；字段名待核 |
| `locator` 对象 | 卷页 locator（`volume`、`folio_recto_verso`、`image_frame`、`archive_id`…） | **字段名不同**：日方有表裏和影像帧号，本方有栏、行。R2 前要定共同的超集 |
| `part_of` / `historical_name_of` / `lineage_successor_of` / `legal_successor_of` | 同名 | 同名同义（待核） |
| `subordinate_to` ⊃ `jp:honmatsu` | `honmatsu` | 日方是顶层谓词；本方把它降为区域子谓词。**需双方协商** |
| `affiliated_with` | `affiliated_with` / `denomination_member` | 待核 |
| `idc:` | IdentityCandidate | 对应 |
| `evidence_mode` / `review_state` 分离 | 同 | 一致 |
| `witness_genre`、Source 三栏许可、`cites`、RankSet、`source_later_than_claim` | 未见 | 本方新增；建议日方采纳（例如《扶桑五山记》本身就是江户写本） |

## 10｜合成样例

目录 `scripts/sam/fixtures/research_entities/`：

- `valid_minimal.json`：只包含合成数据，覆盖全部对象类型各至少一例，用来展示结构。
- `invalid_cases.json`：一个数组，共 20 项，每项为 `{case, expect, patch}`。`patch` 是相对 `valid_minimal.json` 的 RFC 6902 子集（只用 `replace`/`add`），`expect` 是**必须出现**在报错集合中的错误码（同时报出其他错误也可以）。R2 校验器必须让每一条都失败，以满足 AGENTS §3 的负例要求。
- `valid_minimal.json` 在 draft 阶段应当零错误；警告允许出现（例如 `RW_SAME_NAME` 不会出现，因为两个同名机构之间已有 idc）。`cn:synthetic_rank` 是样例专用的等级体系 ID，区域词表在 R2 时补上。

这两份文件都是**规格附件**，不是史料。名称一律写成「合成寺甲」之类，年代是随意取的整数。

## 11｜变更记录

| 日期 | 变更 | 署名 |
|---|---|---|
| 2026-11-05 | 起草 0.1.0（R1 草案），纳入 R0 回写核验结论 | Sam's Agent(Opus-5.5) |
