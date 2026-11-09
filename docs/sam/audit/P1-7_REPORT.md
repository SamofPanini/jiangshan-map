# P1-7 执行报告

## 交付物清单

- `scripts/sam/research_contract.js` 与 `docs/sam/CONTRACT.md`：v0.3 类型、版本分支、几何和观测规则及文档。
- `js/sam/research_layer_core.js`、`js/sam/research_layer.js`：四类日期筛选、标签、统计及样式，旧函数保留别名。
- `scripts/sam/validate_research.test.js`、`scripts/sam/research_layer_core.test.js`：正负例及 DOM 桩测试。
- `scripts/sam/fixtures/research_demo/demo_v03.geojson`：5 个合成要素（决口 1、主流 1、范围线 2、前锋 1）。

## 验证结果（逐项）

### §5.1–5.5 与 §6

修改前两份既有测试均 exit 0，输出分别为 `PASS valid + 25 error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity` 和 `PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA`。修改后：

```text
$ node scripts/sam/validate_research.test.js
EXIT 0
PASS P1-7 version enums + v0.2 extent Point + v0.3 geometry and observed negative/positive cases
PASS valid + 25 error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity

$ node scripts/sam/research_layer_core.test.js
EXIT 0
PASS P1-7 date filters + labels + aliases + rendered marks, styles, counts
PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA

$ node scripts/sam/validate_research.js --data scripts/sam/fixtures/research_demo/demo_v03.geojson --sources scripts/sam/fixtures/research_demo/demo_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json
EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_v03.geojson sha256=d278330cebf7675fe3cc82b57ec7a3910293f7ff0bc01267709bbefb7ac714ee features=5 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/4/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

测试覆盖旧版新类型 E_ENUM、v0.2 范围 Point、v0.3 几何和 observed 正反例、四类日期、null 与其他类型、标签、别名、胶水层的图形/样式/横幅。原有「非前锋不受影响」断言只针对 river_course，仍符合新规则，故未删改；新增有日期的 river_course 断言，另测四类受影响。

v0.2 `flood_extent` Point：最初未单独保存变更前输出。之后将允许范围内的 `git diff -- scripts/sam/research_contract.js` 保存到 `/tmp/p1-7-contract.patch`，对 `/tmp` 中当前契约副本 `patch --reverse --silent` 重建修改前版本，再以同一内存 fixture 分别调用两版 `validateDataset`，实测：

```text
reverse patch exit: 0
reconstructed before: {"errors":[],"warnings":[]}
after: {"errors":[],"warnings":[]}
equal: true
```

### §5.1 四份旧数据：前后输出逐字对照

使用 `node scripts/sam/validate_research.js --data <所列数据> --sources <对应来源> --legacy-inventory docs/sam/audit/hydro_inventory.json`；前后字节比较 `baseline identical: True`。以下保留完整输出。

修改前：

```text
COMMAND scripts/sam/fixtures/research_demo/demo_synthetic.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=7c6cc775cd6a6000bf07f5ea115b8f9a4b15baf36ee5ca5ee08936038c8dc9e8 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
COMMAND scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson sha256=b0410b90235b6ac7ef13b4ceaaf38f8c4742da6252b0d4b545b10637ba2dafe5 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
COMMAND data/sam/huanghe1938/fronts_bmap_georef_v2.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_bmap_georef_v2.geojson sha256=8ffffbce667ed01e92f4ff23a75bad8c8bd11f5f806f559555fad9f6ab56263d features=11 sources=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_sources.json sha256=49cd1bb4b48a81b6de4c7ff804737641b583485ffd0d393aff8c982389f3bfa7 source_count=3 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=false
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/10/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/4/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/5/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/6/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/7/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/8/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/9/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
WARNING W_LICENSE_UNKNOWN /sources/1/license_status draft source license is unknown
COMMAND data/sam/huanghe1938/fronts_place_anchor_v1.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_place_anchor_v1.geojson sha256=d06795fe3c2d6e0c640f276ea2c2f394a56c66329c3f9175b658ce89939a2d63 features=8 sources=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_sources.json sha256=49cd1bb4b48a81b6de4c7ff804737641b583485ffd0d393aff8c982389f3bfa7 source_count=3 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=false
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

修改后：

```text
COMMAND scripts/sam/fixtures/research_demo/demo_synthetic.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=7c6cc775cd6a6000bf07f5ea115b8f9a4b15baf36ee5ca5ee08936038c8dc9e8 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
COMMAND scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_fronts_v02.geojson sha256=b0410b90235b6ac7ef13b4ceaaf38f8c4742da6252b0d4b545b10637ba2dafe5 features=4 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
COMMAND data/sam/huanghe1938/fronts_bmap_georef_v2.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_bmap_georef_v2.geojson sha256=8ffffbce667ed01e92f4ff23a75bad8c8bd11f5f806f559555fad9f6ab56263d features=11 sources=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_sources.json sha256=49cd1bb4b48a81b6de4c7ff804737641b583485ffd0d393aff8c982389f3bfa7 source_count=3 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=false
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/10/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/3/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/4/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/5/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/6/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/7/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/8/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/9/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
WARNING W_LICENSE_UNKNOWN /sources/1/license_status draft source license is unknown
COMMAND data/sam/huanghe1938/fronts_place_anchor_v1.geojson EXIT 0
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_place_anchor_v1.geojson sha256=d06795fe3c2d6e0c640f276ea2c2f394a56c66329c3f9175b658ce89939a2d63 features=8 sources=/Users/sam/Documents/Explore/project/jiangshan-map/data/sam/huanghe1938/fronts_sources.json sha256=49cd1bb4b48a81b6de4c7ff804737641b583485ffd0d393aff8c982389f3bfa7 source_count=3 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=a0586199f9adf44f23828f7dff004a63c658ea063d35a54a66df38ed219f3b28 legacy_count=323 stage=draft synthetic=false
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

### §5.6 变异自检

将 v0.3 几何限制的 `if (types && !types.includes(...))` 临时替换为 `if (false && types && !types.includes(...))`，运行下列命令；随后在 `finally` 中按原字节恢复，再重跑测试（见上）：

```text
COMMAND: temporarily replace condition with false && condition; node scripts/sam/validate_research.test.js
EXIT 1
node:assert:150
  throw new AssertionError(obj);
  ^

AssertionError [ERR_ASSERTION]: breach invalid geometry
+ actual - expected

+ Set(0) {}
- Set(1) {
-   'E_GEOM_FEATURE'
- }

    at Object.<anonymous> (/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/validate_research.test.js:194:10)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: Set(0) {},
  expected: Set(1) { 'E_GEOM_FEATURE' },
  operator: 'deepStrictEqual',
  diff: 'simple'
}

Node.js v22.23.2
```

### 上游回归

```text
$ node scripts/validate_atlas.js
EXIT 0
  [perf #196] modern provinces: fillL 23997 -> 9511 (-60.4%), boundaryL=6194 (M=253, intBytes=42366, outBytes=34810, tiles=10)
✓ Jiangshan Atlas validation (full) passed in 53704.1 ms:
  - 18 dynasties, 189 snapshots (187 phase-linked), 2430 timeline years swept
  - 21829 historical polygons (3,683,211 vertices) verified lossless & collision-free
  - 35 modern provinces (314 rings)
  - 1760 ancient settlements & 485 historical milestones
  - 7 journeys (74 bilingual stops), 351 era spans, 694 landmark events & 186 gazetteer landmarks verified across 40 E2E CUJs
  - 110 curated regional/rival regime profiles verified
```

待主会话浏览器终验。启动本地服务后，建议分别打开：

- `http://127.0.0.1:8765/?year=1938&research=scripts/sam/fixtures/research_demo/demo_v03.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json`
- `http://127.0.0.1:8765/?year=1938&research=scripts/sam/fixtures/research_demo/demo_v03.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json&research_date=1938-06-14`

预期前者 5 个要素及日期标签，决口为 ×，范围为细实线，主流为较深虚线；后者仅显示 6/13 决口及 6/14 范围和前锋。检查缩放、标签及横幅；DOM 桩不能替代浏览器视觉验收。

## 规格偏差

- 任务单指定的数量与实测：无出入。样例为 5 个要素，范围线 2 条，其中 1 条 MultiLineString；四份旧数据分别为 4、4、11、8 个要素。
- 修改前 Point 个案输出未事先保存；上面明确标示了用逆补丁重建旧代码的事后对照，并非声称当时运行。四份真实旧数据及既有 demo 的前后输出是实际事前和事后采集。
- §2 的表达局限：若原资料只说事件发生在 6/25–6/28 某一天，`observed` 写 `[1938-06-25, 1938-06-29)` 同样可以表示其间持续；契约不能区分两者。按 §3 的 `date_from` 累积显示，在 6/25 即显示可能使读者误以为当日已确定发生。按任务单照原设计实现，未自行更改。

P1-7 DONE
