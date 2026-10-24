# P1-1｜契约 v0.2 与泛滥前锋点执行报告

## 交付物清单

- `scripts/sam/research_contract.js`：写入版本改为 `0.2.0`，读取兼容 `0.1.0`／`0.2.0`；仅 v0.2 支持 Point、MultiPoint、`flood_front`、`observed` 与 `derivation`。
- `js/sam/research_layer_core.js`、`js/sam/research_layer.js`：增加日期参数、前锋可见性／标签／点标记纯函数；绘制小圆点、单色由早至晚渐深的前锋点及日期标签；横幅与 SVG `<title>` 显示观测和派生信息。线状 `flood_front` 也取首点放置日期标签。
- `scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson`：4 个合成 `flood_front` feature、5 个点标记（其中一个 MultiPoint 两点）；日期为 1938-06-13、06-19、06-25 至 06-29、07-02；全部落在规则网格，未采用真实地名坐标。
- `docs/sam/CONTRACT.md`：同步 v0.2 兼容规则、字段、枚举、错误码，并写明 `flood_front` 与 `flood_extent` 不得互相推导；审核记录推迟至 v0.3 的触发条件。
- 两个测试文件：覆盖 v0.1 不变、v0.2 必填键、日期、派生、点几何、日期过滤、标签、SVG title 和点渲染。

未修改 `index.html`、`js/app.js`、现有 `demo_synthetic.geojson` 与 `demo_sources.json`。工作树内另有未跟踪的 `docs/sam/tasks/P1-2_georef_tool_TASK.md`；非本单白名单文件，未读取或修改。

## 验证结果（逐项）

1. `node scripts/sam/validate_research.test.js`：exit 0。覆盖任务单 §5 的 v0.1 兼容、必填键、`observed`、`derivation`、Point／MultiPoint、`E_POINT_DUP`、bbox 与 NaN，以及文档枚举／错误码一致性。

```text
PASS valid + 24 error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity
```

2. `node scripts/sam/research_layer_core.test.js`：exit 0。覆盖 `parseResearchDate`、`isFrontVisibleOn`、`frontLabel`、`pointMarks`，以及胶水层调用纯函数、5 个点标记、日期标签和 `<title>`。

```text
PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA
```

3. 改动前后 v0.1 演示对照：`scripts/sam/fixtures/research_demo/` 原有的两个演示文件是一个 GeoJSON 数据集和一个 source manifest；可校验数据集 `demo_synthetic.geojson` 的 CLI 输出逐字相同。改动前为 exit 0：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=7c6cc775cd6a6000bf07f5ea115b8f9a4b15baf36ee5ca5ee08936038c8dc9e8 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=0bf698ce620a3f69aad47fc70a91b74d6999a16d8ae08ee59a7f08a331cc0098 legacy_count=290 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

   改动后为 exit 0，真实 stdout 如下（与上块逐字相同）：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=7c6cc775cd6a6000bf07f5ea115b8f9a4b15baf36ee5ca5ee08936038c8dc9e8 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=0bf698ce620a3f69aad47fc70a91b74d6999a16d8ae08ee59a7f08a331cc0098 legacy_count=290 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

4. `node scripts/sam/validate_research.js --data scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson --sources scripts/sam/fixtures/research_demo/demo_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`：exit 0。真实输出如下；五个 `W_LICENSE_UNKNOWN` 是既有 draft／synthetic 许可语义，不是错误。

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson sha256=b0410b90235b6ac7ef13b4ceaaf38f8c4742da6252b0d4b545b10637ba2dafe5 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=0bf698ce620a3f69aad47fc70a91b74d6999a16d8ae08ee59a7f08a331cc0098 legacy_count=290 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

5. `node scripts/validate_atlas.js`：exit 0、无 stdout（实测 30.6 秒）。`git diff --check`：exit 0、无输出。

6. 浏览器内显示：待主会话浏览器终验。本环境未做浏览器／GUI 验证。建议检查：

   - `http://127.0.0.1:8765/?research=scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json`：1938 年显示 5 个浅红至深红点和 5 个日期标签；横幅报告 4 个前锋 feature 及半开观测范围。
   - `http://127.0.0.1:8765/?research=scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json&research_date=1938-06-19`：只保留 06-13 和 06-19 的两个前锋点；非前锋要素不应受该参数影响。

   演示中标签重叠最严重的是纬度 34 的三点（经度 114、114.5、115），三个日期标签仅相隔 0.5 度；v0.2 按规格允许重叠，未实施避让。

本单里的数与你实测有出入吗？无：新 demo 有 4 个 feature，包含 3 个 Point feature、1 个 MultiPoint feature，共 5 个绘制点；原演示目录也确有 2 个文件（数据集和来源清单）。

## 规格偏差

无。

设计观察（未擅自改方案）：

- `observed` 是日粒度半开区间，而 `valid` 是年粒度半开区间。例：`valid=[1938,1939)` 会接受 1938 年任一天，即使研究者实际只知道该要素在 1938 年末存在；这是当前“观测日必须落在 valid 年份内”规则的必然粗粒度，不能据此倒推更精细的有效期。
- `date_from`／`date_to` 使用公历 `YYYY-MM-DD`，不能直接表示公元前或原图的非公历日期。`as_written` 能保留“九月上旬”等原文，但若将来要显示其不确定范围，需要另行定义历法／精度字段；本单未添加。

P1-1 DONE

## r2

### 交付物清单

1. `flood_front` 在 v0.2 仅接受 Point、MultiPoint、LineString、MultiLineString 或 null（并仍要求 null geometry 配缺图理由）；Polygon／MultiPolygon 等报新增 `E_GEOM_FEATURE`。v0.1 未改。
2. 契约与 `parseResearchDate` 都改用 `Date#setUTCFullYear`，正确处理公元 0001–9999；不再受 `Date.UTC` 对 0–99 年映射到 1900–1999 的影响。
3. 增加纯函数 `researchMarkerScale(cameraWidth, viewportWidth)`，与上游 `_rescaleSvgTypography` 使用同一 `z=1000/camera.w` 和移动端系数；包装 `_rescaleSvgTypography`，先执行原函数，再更新研究点 `r`（基准 2.8）和前锋标签 inline `font-size`（基准 6.2px）。
4. SVG `<title>` 只有 v0.2 且相应值非 null 时才写 `observed`／`derivation`；v0.1 与 null 值不再产生占位行。
5. CONTRACT.md 枚举表补入 `SUPPORTED_SCHEMA_VERSIONS`；同步 `E_GEOM_FEATURE`、前锋几何约束和「观测区间整体落在 valid 内」规则。
6. 测试增加孤立非法日期、带 `research_date` 的 `computeVisible` 精确结果、胶水层以 `research_date` 实际仅渲染两个前锋点、0001–9999／闰年、已知端与 unknown/open 另一端组合、前锋 Polygon 负例、缩放三例及 title 省略。
7. 未改 `data/sam/` 的实际数据；只读校验 `data/sam/huanghe1938/fronts_place_anchor_v1.geojson` 与同目录 `fronts_sources.json`。
8. 按任务单“不做”项，未为多日区间新增「其间某日／持续」区分键或显示规则；该项仍推迟到 v0.3。

### 验证结果（逐项）

1. `node scripts/sam/validate_research.test.js` exit 0：

```text
PASS valid + 25 error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity
```

   反例可失败的确认：测试将有效前锋依次变为 Polygon（精确只得 `E_GEOM_FEATURE`）、`1938-02-30`、`1900-02-29`、跨越 `[1938,1939)` 右端的 `[1938-12-31,1939-01-02)`，以及在另一端为 unknown/open 时越过仍为 known 的端；每项均断言 `E_OBSERVED` 或精确错误集合。移除相关实现检查会使对应断言失败。

2. `node scripts/sam/research_layer_core.test.js` exit 0：

```text
PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA
```

   反例可失败的确认：`computeVisible(fronts, 1938, '1938-06-19')` 精确断言只剩 06-13、06-19 两项；拿掉日期筛选即失败。DOM 桩带该 URL 参数精确断言只有 2 个圆点，故胶水层若不采用 `parseResearchDate` 结果即失败。缩放断言覆盖 z=1（1）、z=10（`1/√10`）和 900px 移动端（1.22），并在调用包装后的 `_rescaleSvgTypography` 后核验圆点半径和标签字号都实际改变。

3. 新演示数据仍通过（exit 0）：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson sha256=b0410b90235b6ac7ef13b4ceaaf38f8c4742da6252b0d4b545b10637ba2dafe5 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=0bf698ce620a3f69aad47fc70a91b74d6999a16d8ae08ee59a7f08a331cc0098 legacy_count=290 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

4. 指定实数据只读校验 exit 0、errors=0；以下为完整 stdout。10 条 `W_LICENSE_UNKNOWN` 是 draft 许可警告，不是错误：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_place_anchor_v1.geojson sha256=d06795fe3c2d6e0c640f276ea2c2f394a56c66329c3f9175b658ce89939a2d63 features=8 sources=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_sources.json sha256=49cd1bb4b48a81b6de4c7ff804737641b583485ffd0d393aff8c982389f3bfa7 source_count=3 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=0bf698ce620a3f69aad47fc70a91b74d6999a16d8ae08ee59a7f08a331cc0098 legacy_count=290 stage=draft synthetic=false
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/4/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/5/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/6/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/7/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
WARNING W_LICENSE_UNKNOWN /sources/1/license_status draft source license is unknown
```

5. `node scripts/validate_atlas.js` exit 0、无 stdout（实测 30.4 秒）；`git diff --check` exit 0、无输出。

6. 浏览器缩放效果：待主会话浏览器终验。建议以演示 URL 打开：

   - `http://127.0.0.1:8765/?research=scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json`：横幅应为「本年 flood_front 4 个（日期范围 [1938-06-13, 1938-07-03) 半开）」；SVG `<title>` 有 non-null 的 observed／derivation 行。
   - 同 URL 加 `&research_date=1938-06-19`：横幅仍报告本年 4 个，另显示「1938-06-19 可见 2 个」；图上仅 06-13、06-19 两个前锋点。
   - 在开发者工具令 `window.atlasApp.camera.w` 依次为 1000、100，并各调用 `window.atlasApp._rescaleSvgTypography()`；桌面宽度下首个 `.sam-research-point` 的 `r` 应约为 `2.800`、`0.885`，首个 `.sam-research-front-label` 的 inline `font-size` 应约为 `6.200px`、`1.961px`。

本单里的数与你实测有出入吗？无。指定实数据实测为 8 个 feature、3 个 source、10 条未知许可警告、0 个 error；§8 未给出相冲突的预期数量。

### 规格偏差

无。

P1-1 r2 DONE
