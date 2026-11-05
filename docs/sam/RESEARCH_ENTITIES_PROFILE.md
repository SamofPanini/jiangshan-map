# 研究实体契约 profile `research_entities` 0.1.0（R1 草案 r2）

> 状态：**草案，未实现**。只有文档和合成样例，没有校验器；校验器排在 R2，也就是 P1 第 6 项通过之后（ROADMAP §1，2026-11-05 裁定）。
> **r2（2026-11-05）**：已对照 `SamofPanini/Japan-s-Temple-v2` 的 `docs/CONTRACT.md`（v0.1.0，以 `tools/contract.py` 为准，对照时的提交为 `3fd5611`）原文，改为**以 JP 契约为底、中国需要作为扩展**。r1 中与 JP 不一致的设计已撤回，撤回项见 §10。
> 背景见 [RELIGION_LAYER_PLAN.md](./RELIGION_LAYER_PLAN.md)；合成样例在 `scripts/sam/fixtures/research_entities/`（虚构名称与年代，不是史料）。

## 0｜三份契约的关系

| 契约 | 管什么 | 本 profile 怎么用 |
|---|---|---|
| jiangshan [CONTRACT.md](./CONTRACT.md) v0.2.0 | 水系几何 Feature | 继承区间语义、`review_state`、release 门槛、几何校验；**不继承** `evidence_mode` 的 `schematic`（见 §8 D1） |
| JP `docs/CONTRACT.md` v0.1.0 | 日本寺社：registry＋layers | **结构、键名、ID 前缀、谓词按它来**。中国侧需要的东西作为扩展键或扩展文件加上，JP 侧现有数据不需要改 |
| 本 profile | 两者之上的「机构—地点—派系—关系」共同读法 | 区域写在 manifest 和 ID 里；扩展键一律可为 null，JP 数据缺这些键时按 null 读 |

## 1｜目录（同 JP）

```
registry/                         # 跨图层共享；名称不是主键
  sources.json                    # 来源
  denominations.json              # 派系节点（den:）
  denomination_claims.jsonl       # 派系之间的关系
  institutions.jsonl              # 机构（tmp:）
  identity_candidates.jsonl       # 身份候选（idc:）
  persons.jsonl                   # 【cn 扩展】人物（per:）
  rank_sets.jsonl                 # 【cn 扩展】等级名单（rks:）
layers/<layer_id>/
  manifest.json                   # 一个时间切片 × 地域 × 主题
  sites.geojson                   # Site：某机构在某时段的位置（可无几何）
  claims.jsonl                    # 关系主张
```

jiangshan 侧存放位置待 R2 再定。研究数据须先有校验器才能落地（AGENTS §2），所以 R1 不建 `data/` 目录。

## 2｜ID 前缀

JP 已有的前缀：`tmp:` 机构（寺、院、庵、宫、观都用它；**按 JP 的用法，`tmp` 只是「机构」的前缀，不表示宗教**）· `site:` · `den:` · `src:` · `clm:` · `idc:` · `fam:`。
cn 扩展前缀：`per:` 人物 · `rks:` 等级名单。

本地串约定为 `<region>-…`，例如 `tmp:cn-hz0001`、`den:cn-linji`。这只是约定：JP 现有 ID（如 `tmp:mnt-0001`）不带 region，两边并存不会撞号，JP 不必改。

## 3｜时间

同 JP 和 jiangshan：`valid = {interval:"half_open", from, to, from_status, to_status}`，整数年，没有公元 0 年；known 端点必须是整数，open 或 unknown 端点为 null。原文纪年写在 claim 的 `as_written`，或名称、地点的 note 里。

## 4｜对象（JP 原键＋【cn】扩展键）

### 4.1 Source

- **JP 原键**：`source_id, title, author_or_org, edition, url, source_kind, license_status, license_note, accessed, synthetic`。`source_kind` 用 JP 枚举：`archive_original`、`modern_edition`、`exhibit_panel`、`dataset`、`official_web`、`secondary`（fosizhi 影印本记为 `modern_edition`，碑拓原件记为 `archive_original`）。
- **【cn】扩展键**：
  - `witness_genre`：材料体裁，取 `gazetteer_local`/`gazetteer_monastic`/`lamp_record`/`recorded_sayings`/`inscription`/`edict`/`biography`/`catalogue_modern`/`modern_map_data`/`other`。它和 `evidence_mode` 不是一回事：前者说材料是什么，后者说主张怎么论证出来。
  - `work_date`、`edition_date`：都是 valid 对象，分别记成书或刻石时间、所用版本的刊刻或出版时间。
  - `license_metadata`、`license_transcription`、`license_scan`：三栏分记，取值同 `license_status`。规则：只有三栏中用得到的各栏都是 `cleared`，`license_status` 才能写 `cleared`。站点的总括声明不能推定其中任何一栏，例如 fosizhi 影印 JPEG 的 `license_scan` 记为 `unknown`。
  - `cites`：本来源转引的 `src:` 列表，记录转引链。

### 4.2 Denomination（派系节点，`den:`）

- **JP 原键**：`id, label, level, valid, source_id, note`。`level` 取 JP 枚举：`historical_label`、`school`、`branch`、`lineage`、`umbrella`。
- **【cn】扩展键**：
  - `tradition`：`buddhist`/`daoist`/`other`。
  - `label_basis`：`self_identification`（自称）、`contemporary_external`（同时代他称）、`retrospective`（后世史学分类）。「五家七宗」的框架、「虎丘派」的标签都要标明是哪一种。
- 宗教传统本身也建成 `umbrella` 级的派系节点，例如 `den:cn-buddhism`、`den:cn-daoism`。一个机构属于哪个传统，用 `member_of_denomination` 指向这些节点，可以有时效、可以多值。三教合一、佛道共祀不需要另设字段（这一条取代 r1 的 `religious_tradition` 字面值谓词）。
- 别名和旧称不写在节点上，而是另建节点，用 `historical_name_of` 连接（JP 做法）。

### 4.3 Institution（机构，`tmp:`）

- **JP 原键**：`id, kind, names, valid, end_reason, external_ids, review_state, note`。
  - `kind` 取 JP 枚举 `temple`/`shrine`/`other`；中国的寺、院、宫、观一律记为 `temple`，具体称谓看名称。
  - `end_reason` 取 `abolished`/`merged`/`unknown` 或 null。
  - `external_ids` 用 JP 的「键→列表」形式，cn 侧的键集合是 `wikidata`、`osm`、`cbdb`、`dila_place`、`chgis`；键集合按区域定义（§7）。
- **名称段（JP 原键）**：`name, romanized, valid, source_id, locator`。证据直接挂在名称段上（JP 做法，取代 r1 的 `attested_by` 谓词）。
- **名称段【cn】扩展键**：
  - `name_type`：`full`/`short`/`common`/`granted`（敕额、赐额）/`other`。
  - `as_written`：原文写法；≤40 字的限制见 §6。
- 赐额改名的写法：同一个 `tmp:`，新名称段 `name_type: granted`，带自己的出处。**不另建实体**，r1 的 Event 对象撤回。

### 4.4 Site（地点断言，`site:`）

采用 JP 模型：**一个 Site 就是「某一个机构在某一时段的位置」**，也就是一条地点断言，不是独立的物理地点。迁址就多建几个 Site；改寺为观、在原址另建等「同址不同机构」的情况，就是两个 Site 坐标相近。这一条取代 r1 的「物理地点＋`located_at` 谓词」。

- **JP 原键（properties）**：`institution_id, valid, address_as_written, geometry_absent_reason, spatial_error{value_m, reason}, derivation{method, note}, evidence_mode, review_state, claims[{source_id, locator, supports}], note`。
  - `derivation.method` 用 JP 枚举：`wikidata_coord`/`geocoded_address`/`historical_map_georef`/`manual`。
  - geometry 只能是 `Point`、`MultiPoint`、`Polygon` 或 null。
- **【cn】扩展键**：
  - `anchor`：null 或 `{anchor, relation, distance_text, direction_text}`。`anchor` 指向另一个 `site:`，或 `chgis:<id>` 形式的外部治所；`relation` 取 `within`/`adjacent`/`distance_direction`/`relative_other`。
  - `precision_class`：`exact_site`/`relative_site`/`mountain_or_valley`/`county`/`unknown`。
  - `coordinate_status`：`precise`/`estimated`/`to_be_verified`/`none`。
  - `original_crs`：原始坐标系（如 GRS67）或 null。
- 现代位置回填的规则（§6 R-07）：`derivation.method` 为 `wikidata_coord` 或 `geocoded_address` 的 Site，`valid` 不得早于 1900。

### 4.5 Claim（`clm:`）

- **JP 原键**：`claim_id, subject, predicate, object, valid, as_written, source_id, locator, evidence_mode, review_state, note`。
- **【cn】扩展键**：`source_later_than_claim`（布尔或 null），标出来源成书年代晚于所称时期的情况。
- **Locator**：JP 原键为 `volume, entry_heading, folio, image_frame, archive_id, persistent_url, edition_page, verification_state`。JP 已经把「原本叶次 `folio`」和「影印本页码 `edition_page`」分开，正好对应中国寺志「原刻卷叶」与「丛刊册页」的区别。
  - **【cn】扩展键**：`column`、`line`、`canonical_ref`。CBETA 的写法例如 `volume:"T51"`、`edition_page:"0260"`、`column:"b"`、`line:"03"`、`canonical_ref:"T51n2076_p0260b03"`。
  - claim 没有 locator：draft 阶段报警告 `W_NO_LOCATOR`（同 JP），release 阶段报错（cn 规则，比 JP 严）。

### 4.6 IdentityCandidate（`idc:`）

完全采用 JP 的键：`candidate_id, a, b, relation(same_institution|different_institution), source_id, locator, evidence_mode, review_state, note`。**不合并记录**，只登记判断（取代 r1 的 `merged_into`）。

### 4.7 【cn】Person（`per:`）

键为 `id, names[], valid, external_ids{cbdb, dila_person}, review_state, note`，名称段同 §4.3，`name_type` 再加 `dharma`/`courtesy`/`secular`。`cbdb` 的值必须带版本号，例如 `12345@BJ20260602`。外部权威库的合并结果**不能当作同一人的证据**。

### 4.8 【cn】RankSet（`rks:`）

整组断言，用来落实 JP 保留未启用的 `historical_rank`：

```
{ id, system, members:[{tier, position, institution_id|null, name_as_written}],
  asserted_period: valid, asserted_period_as_written, source_id, locator,
  source_later_than_claim, evidence_mode, review_state, note }
```

不同来源的名单各建一个 RankSet，可以并存和比较，不合成一份统一名单。「律院不在五山十刹之列」这类否定性记载写在 note。`system` 的取值（如 `cn:wushan_chan`、`cn:wushan_jiao`）放在区域词表。

## 5｜谓词

| 谓词 | 主语 → 宾语 | 来源 | 门槛 |
|---|---|---|---|
| `member_of_denomination` | tmp → den | JP | 只有直接记载才能标 `attested`。由住持法脉推出的宗属标 `inferred`，并在 note 里写推导链；同宗派的两个机构之间不生成任何边 |
| `honmatsu` | tmp → tmp | JP | 日本本末；中国不使用 |
| `subtemple_of` | tmp → tmp | JP | 塔头、寺中、院内庵堂；不推出组织从属 |
| `merged_into` / `revival_of` | tmp → tmp | JP | **再兴默认是新实体**（JP），同址同名重建也一样 |
| `relocated` | tmp → null | JP | 只主张「迁过」，位置由多个 Site 表达 |
| `bodaiji_of` | tmp → fam | JP | |
| `historical_name_of` / `lineage_successor_of` / `legal_successor_of` / `part_of` | den → den | JP | 多对多、有时效 |
| `affiliated_with` | tmp/den → den | JP | 松散关联；不能当作 `member_of_denomination` 用 |
| 【cn】`xiayuan_of` | tmp → tmp | 新 | 下院对本院。**和 `honmatsu` 不能互推** |
| 【cn】`tenure_type` | tmp → 字面值（区域词表，cn 取 `hereditary`/`public`/`mixed`） | 新 | 有时效；甲乙徒弟院与十方住持院可以转换 |
| 【cn】`title_claim` | tmp → 字面值（区域词表，如 `zuting`） | 新 | `valid` 只能从来源能证明的时点开始 |
| 【cn】`abbot_of` / `founder_of` / `resided_or_studied_at` | per → tmp | 新 | `founder_of` 必须填 `source_later_than_claim`；`resided_or_studied_at` 不能升级为传法 |
| 【cn】`tonsured_by` / `ordained_by` / `studied_under` / `entered_chamber_of` / `dharma_heir_of` | per → per | 新 | 五者互不推导。来源体裁为 `lamp_record` 的 `dharma_heir_of` 不得标 `attested` |

JP 保留未启用的谓词（`bunrei_from` 等）仍报 `E_PREDICATE_RESERVED`；`historical_rank` 由 §4.8 的 RankSet 承担，不作为谓词启用。

## 6｜校验规则（R2 实现时的规格）

JP 已有的错误码沿用（`E_TOP_SHAPE` … `E_RELEASE`、`W_NO_LOCATOR` 等），新增的错误码用 `RE_` 前缀：

| # | 规则 | 码 |
|---|---|---|
| R-01 | 引用的扩展键或谓词不在本 profile 内 | `E_UNKNOWN_KEY` / `E_PREDICATE_KIND` |
| R-02 | 谓词主宾种类不符，按 ID 前缀判断（同 JP） | `E_PREDICATE_KIND` |
| R-03 | 断裂引用：`per:`、`rks:` 成员、`cites`、`anchor` | `E_REF` / `E_SOURCE_REF` |
| R-04 | 区间（同 JP） | `E_INTERVAL` |
| R-05 | release 阶段 claim 没有 locator | `RE_LOCATOR` |
| R-07 | Site 的 `derivation.method` 为 `wikidata_coord` 或 `geocoded_address`，但 `valid` 早于 1900 | `RE_MODERN_BACKFILL` |
| R-08 | `dharma_heir_of` 的来源体裁为 `lamp_record`，却标了 `attested` | `RE_EVIDENCE_GATE` |
| R-09 | `member_of_denomination` 标 `attested`，但来源体裁是 `catalogue_modern` 或 `modern_map_data` | `RE_EVIDENCE_GATE` |
| R-10 | `source_later_than_claim` 与来源 `work_date` 矛盾（两边都是 known 时才查） | `RE_SOURCE_DATE` |
| R-11 | `as_written` 超过 40 字；或来源的 `license_transcription` 不是 `cleared`、底本也不是公有领域古籍，却填了 `as_written` | `RE_QUOTE` |
| R-12 | Site 的 geometry、`coordinate_status`、`geometry_absent_reason` 三者不一致 | `RE_SITE` |
| R-13 | `license_status` 为 `cleared`，但三栏中有一栏是 `unknown` 或 `restricted` | `RE_LICENSE` |
| R-15 | 两个机构有同名名称段，彼此之间却没有任何 idc：只报警告，**不合并** | `RW_SAME_NAME` |

## 7｜区域词表

`vocab/<region>.json` 定义：`external_ids` 的键集合、RankSet 的 `system` 与 `tier`、`tenure_type` 和 `title_claim` 的取值。共享层不出现「朝代」「敕额」「五山」「本末」这类词（AGENTS §5）。JP 现在把 `EXTERNAL_ID_KEYS` 写在全局常量里，迁入共同读取方时要改为按区域定义（§8 P-4）。

## 8｜待裁与对 JP 的提案

**待 Sam 裁定**：

- **D1 证据方式枚举分叉**：jiangshan 是 `attested/reconstructed/schematic/hypothesis`，JP 是 `attested/reconstructed/inferred/hypothesis`。本 profile 跟 JP，因为 `inferred` 正好表达「由住持×法嗣推出的宗属」「同址同名推定」。代价是 research_entities 和 jiangshan 水系契约各用一套，共同读取方须按 profile 区分。备选方案是四者合并成五值超集，两份契约都改。**2026-11-05 Sam 裁：跟 JP，水系契约不动。**
- **D2 空间误差键名**（随 D1 一并按「跟 JP」处理）：jiangshan 用 `{value, reason}`，JP 用 `{value_m, reason}`。本 profile 跟 JP（单位写进键名更清楚）。水系契约不动。

**对 JP 的提案**（2026-11-05 Sam 裁：**先挂着，R2 启动前再议**；不打断 JP 当前工作，JP 契约保持 v0.1.0）：

- P-1：把 Source 的 `witness_genre`、`work_date`、`edition_date`、三栏许可、`cites` 作为**可选键**加入 JP。JP 自己也有需要：江户写本《扶桑五山记》、转引《芝區誌》的二次资料。
- P-2：Locator 加入可选键 `column`、`line`、`canonical_ref`。
- P-3：名称段加入可选键 `name_type`、`as_written`。
- P-4：`EXTERNAL_ID_KEYS` 改为按区域定义。
- P-5：用 RankSet 的形式启用 `historical_rank`（日本寺格也是不同来源各有名单）。
- P-6：Person（`per:`）沿用本 profile 的形式；JP 自己的「以后再加」里也列了 Person。

- P-7：`REGIONS` 加入 `cn`（或由共同读取方注入区域表）。

**兼容性实测（2026-11-05，JP `3fd5611` 的 `tools/validate.py`）**：
- 把合成样例的 cn 扩展键、cn 扩展对象与 cn 扩展谓词剥掉，manifest 的 region 改为 `jp`，坐标平移进 jp bbox：**0 错误、0 警告**，exit 0。⇒ 本 profile 的 JP 底层与 JP 契约同构。
- 原样不剥：exit 1，报 `E_UNKNOWN_KEY` 62 处、`E_REQUIRED` 6 处（`external_ids` 缺 `houjin_bango`/`tokyo_ninsho`，对应 P-4）、`E_REGION` 1 处（对应 P-7），另有 `E_SOURCE_REF` 1 处（sources 因未知键被拒后连带报出）。⇒ 本节「JP 现在读不了 cn 扩展」已实测确认。

JP 的 validator 是严格键：在 JP 采纳 P-1～P-3 之前，cn 数据带扩展键过不了 JP 的校验。共同读取方要么等 JP 采纳，要么自己维护一份「JP 键＋cn 扩展键」的键表。

## 9｜合成样例

`scripts/sam/fixtures/research_entities/`（r2 已按新结构重写）：

- `valid/`：最小的 registry 和一个 layer，覆盖全部对象类型与扩展键，draft 阶段应当零错误。
- `invalid_cases.json`：每项为 `{case, expect, file, patch}`，patch 是作用于 `valid/<file>` 的 RFC 6902 子集。`expect` 必须出现在报错集合中。R2 校验器必须让每一条都失败。

## 10｜r1 → r2 撤回项

| r1 设计 | r2 处理 | 理由 |
|---|---|---|
| 前缀 `inst:` / `sch:` | 改用 `tmp:` / `den:` | 与 JP 一致 |
| 单文件数据集 | 改用 registry＋layers | 与 JP 一致 |
| Site 是物理地点，加 `located_at` 谓词 | Site 是「机构×时段」的地点断言 | 与 JP 一致；地点断言本身也合 DR 的建议 |
| Event 对象（`evt:`） | 撤回；赐额改用名称段，迁址用 `relocated`，合并用 `merged_into`，重建用 `revival_of`，存废用机构的 `valid` 加 `end_reason` | JP 已有对应做法；事件对象等有发布者、参与者需求时再加 |
| `attested_by` 谓词支撑名称 | 名称段直接带 `source_id`/`locator` | 与 JP 一致 |
| `religious_tradition` 字面值 | 改为 `member_of_denomination` 指向 umbrella 节点 | 少一个谓词，三教并存照样表达 |
| `subordinate_to`，并把 `honmatsu` 降为子类 | 撤回；`honmatsu` 与 `xiayuan_of` 并列，在文档中声明不能互推 | 不要求 JP 改顶层谓词 |
| idc 的 `basis` / `merged_into` | 撤回，采用 JP 键 | JP 不合并记录 |
| claim 的 `dating_uncertainty`、`negated`、`quote` | 撤回，分别由 valid 的端点状态、RankSet 的 note、`as_written` 承担 | 与 JP 一致 |

## 11｜变更记录

| 日期 | 变更 | 署名 |
|---|---|---|
| 2026-11-05 | r1：起草，纳入 R0 回写核验结论 | Sam's Agent(Opus-5.5) |
| 2026-11-05 | r2：对照 JP 契约原文（`3fd5611`）重写为「JP 底＋cn 扩展」；登记待裁 D1/D2 与对 JP 的提案 P-1～P-7 | Sam's Agent(Opus-5.5) |
| 2026-11-05 | 样例按 r2 结构重写（registry＋layer、20 个反例）；JP 校验器兼容性实测 | Sam's Agent(Opus-5.5) |
| 2026-11-05 | Sam 裁 D1/D2＝跟 JP（水系契约不动）；对 JP 提案 P-1～P-7 挂起至 R2 前 | Sam's Agent(Opus-5.5) |
