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
