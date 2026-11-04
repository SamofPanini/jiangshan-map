# S1 上游同步执行报告

## 交付物清单

- `js/sam/research_layer.js`：包装 URL 状态序列化，保存启动快照，加入兼容性与防替换检查。
- `scripts/sam/research_layer_core.test.js`：URL、非法参数、防替换、地形四组合和跨年刷新断言；同步 R2-04 数字。`scripts/sam/fixtures/contract/legacy_inventory_min.json`：同步三个既有黄河条目的清单引用和输入哈希。
- 生成四份 P0a-1 清单及报告；旧文件备份在 `docs/sam/audit/_pre_s1/`（不提交）。更新 `UPSTREAM_TRACKING.md`、`UPSTREAM_FEEDBACK.md`。

## 验证结果（逐项）

### §2 URL 与启动时序

`js/sam/research_layer.js:24`–28 解析启动时参数及日期；84–104 行配置错误直接拒绝，缺方法报兼容错误，原方法输出补入快照，日期不存在时不添加；257 行校验包装未被替换。无研究模式时入口直接返回，原方法不变。无效日期亦拒绝启动。测试使用模拟 location、history、原函数，先模拟地址被覆盖再验证快照，另测非研究模式、路径穿越、外域、无效日期和包装被替换。

`js/app.js:1369`–1398：`_syncUrlLangParam` 未 arm 时从现有 `location.search` 构造参数并只改变 lang；已 arm 时调用 `_writeUrlState`（1430–1444），进而调用已包装的 `_urlStateParams`。`index.html:726`–731 顺序加载，上游 `js/app.js:15964`–15965 把控制器创建登记到 DOMContentLoaded；研究脚本执行于事件前，先读查询。构造器 475–477 调 `_restoreFromQuery`，该函数 15782 才 arm；所以深链同步不会先于研究层快照。

### §3 地形与研究图层

`js/app.js:2126`–2136 的 `toggleTerrainMode` 只隐藏 `grpTerrain` 和 `grpRivers`；研究层在 `js/sam/research_layer.js` 的 `_buildTerrainRivers` 包装中将研究组插为 `grpRivers` 的兄弟。`jumpToYear`（`js/app.js:9207`、9250–9252）在水系 mask 变化时重建，不依赖地形状态；研究层的 `_hydroMask` 包装把研究要素可见集合纳入 mask，因此无需新增刷新挂点。四行地形／研究开关测试和地形关闭时 1938→1947 的更新测试通过；日期筛选另有测试。

任务单所说的 `grpRivers` hidden 判定实测位于 `_rescaleSvgTypography`（`js/app.js:9949`），属于文字布局而非 hover；它查询上游 `.hydro-label`，研究点与标签在独立兄弟组。研究点具有 SVG 原生 `<title>`，标签 `pointer-events:none`，没有上游自定义 hover 交互。DOM 替身验证不等于浏览器实际渲染或命中测试。

### §4 清单差异

生成命令：`node scripts/sam/hydro_inventory.js --geo js/china_geo_data.js --map js/map_data.js --out-dir docs/sam/audit --margin-deg 0.5`；输出：

```text
READ geo=js/china_geo_data.js sha256=cd5b0736376b352b7cf906e087d7830726530b4794ff7d9b4c5207fed1229fc6 map=js/map_data.js sha256=fc9035efcd99d736dd86b042e7058c55aaf5eb368860491e598b3a25606d7227 rivers=194 lakes=62 labels=67 corridors=16
```

entry 总数 290 → 323；河流 187 → 194，湖泊 62 → 62，标注 41 → 67，交通线 16 → 16。消失 1、新增 34（其中一对为同名指纹变更），下列完整列出。指纹变更：`river:Namhan:d9a9167e1237` → `river:Namhan:8d0e175c7890`；rank 7 → 3，名称、14 个坐标点、1 条线、bbox 与无年代区间均不变。按旧基线、#146（`9ded544`）、#216（`850c83e`）和新 HEAD 快照读取，rank 分别为 7、7、3、3；变更出处 #216。#217（`6fcd786`）不再改变该 rank。

消失：
- `river:Namhan:d9a9167e1237`

新增：
- `label:南岭:325f3606e60d`
- `label:大 漠:78db8ff0320f`
- `label:大兴安岭:3d0535c6d939`
- `label:大别山:d71b2fbdf443`
- `label:大同江:9ed313c2a1c6`
- `label:大巴山:2fbc71a88efc`
- `label:大渡河:40db3df51448`
- `label:天山:e5bdbb112e99`
- `label:太行山:f14215354a18`
- `label:岷山:0c311e6d6de1`
- `label:巫山:1ddff1d17122`
- `label:怒江:d0ce70b35fc6`
- `label:昆仑山:425f3af35a25`
- `label:武夷山:0a87fc542d62`
- `label:澜沧江:ab073d677b41`
- `label:燕山:befb41a288e9`
- `label:燕然山:74a4ca97fed2`
- `label:祁连山:2e7d3e08fe62`
- `label:秦岭:006651318b45`
- `label:葱岭:516e3cf0734c`
- `label:贺兰山:7ad2d6ac6846`
- `label:金沙江:061231c4d6d7`
- `label:长白山:23d1f3e376e6`
- `label:阴山:61d3bda32afd`
- `label:陇山:301fb7034906`
- `label:鸭绿江:e0d33d6c9f4c`
- `river:Chongchon:812bb1867290`
- `river:Daling:063476688723`
- `river:Luan:21b649561179`
- `river:Min Upper:5c07599da4e4`
- `river:Namhan:8d0e175c7890`
- `river:Taedong:120a8d1a4778`
- `river:Tumen:359b7c75395f`
- `river:Yalu:3a60ebd33508`

现存相同 ID 的条目中，0 条字段发生变化，其中非 index 变化 0 条；现存条目的 index 也未变化。`data/sam/**` JSON／GeoJSON 递归检查取得非空 supersedes ID 0 个，故无被引用的消失 ID；示例 fixture 引用的黄河 ID 仍存在。唯一既有条目指纹变更为朝鲜半岛 Namhan，不在黄河、淮河、运河及替代目标内，接受清单。新增中有地形标注，单凭名称不对其研究区空间关系作史实判断。交通清单及 coherence probe 除 meta 外内容相同；hydro 的 meta、entries、static_summary 改变；Markdown 生成结果 diff 为 `4	4	docs/sam/audit/P0a-1_INVENTORY.md`。

### §5 测试原文（末行和退出码）

- `georef_core.test.js`：`georef_core.test.js: 11 required assertions groups passed`；exit 0。
- `hydro_inventory.test.js`：`hydro_inventory.test.js: 14 required cases passed`；exit 0。
- `research_layer_core.test.js`：`PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA`；exit 0。
- `validate_research.test.js`：`PASS valid + 25 error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity`；exit 0。
- `validate_atlas.js --fast`：`  - 110 curated regional/rival regime profiles verified`；exit 0。
- `sync_version.js --check`：`✓ Asset content hashes verified across 10 bundles in index.html & js/app.js`；exit 0。
- `validate_research.js 指定黄河数据`：`WARNING W_LICENSE_UNKNOWN /sources/1/license_status draft source license is unknown`；exit 0。

黄河数据校验实际读取 8 features、3 sources、323 legacy entries，0 error；输出包含 10 条 `W_LICENSE_UNKNOWN` draft 警告。`validate_research.test.js` 首次运行因旧 fixture 的输入哈希不符 exit 1（`AssertionError [ERR_ASSERTION]: mini legacy meta.inputs must match the real inventory`）；同步 fixture 后重跑通过。

变异自检（在备份及 shell EXIT trap 保护下临时删行，随后恢复；最终测试重跑通过）：

```sh
cp js/sam/research_layer.js /tmp/s1-research-layer-original.js
# 设置 EXIT trap 恢复备份
python3 -c "p='js/sam/research_layer.js';s=open(p).read();s=s.replace("    params.set('research', parsed.dataPath);\n",'');open(p,'w').write(s)"
node scripts/sam/research_layer_core.test.js
```

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'year=1938&research_sources=sources.json&research_date=1938-06-19'
- 'year=1938&research=demo.geojson&research_sources=sources.json&research_date=1938-06-19'

    at main (/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/research_layer_core.test.js:147:10) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 'year=1938&research_sources=sources.json&research_date=1938-06-19',
  expected: 'year=1938&research=demo.geojson&research_sources=sources.json&research_date=1938-06-19',
  operator: 'strictEqual',
  diff: 'simple'
}
exit=1
```

未新增刷新挂点，故第二项挂点删除变异不适用。R2-04 坐标变异反例仍断言检测到 1 条漂移。GUI、移动端和真实浏览器命中未测，交派发方终验。按任务单只运行 fast，全量 atlas 由派发方验收。

### §6 文档

依据本地 `4748ca2..7c5cfe3` 的 89 个提交标题逐条 A–F 归类，并复核 UF-01–06；UF-06 已被 #192 的资源哈希校验替代。未联网核对 issue 或史料。

## 规格偏差

- 白名单外想改但未改：无。上游 URL 行为通过 Sam 层包装适配。
- 数字：旧 290 项、新 323 项；89 提交与任务单一致。任务单将 MCP／WebMCP 写作 #174，本地对应合并提交 `66e28af` 标题为 #172，文档保留任务单编号并注明差异。
- §3 将 `grpRivers` 隐藏判断称为 hover，实测是文字布局判断，见上文。新增地形标注是否属于广义研究区未作地理推断；实际受影响的既有指纹仅 Namhan，且没有 supersedes 冲突。
- 候选：上游 URL 状态同步丢弃扩展研究参数；可考虑扩展参数保留机制，由派发方决定是否收录反馈。
- `_pre_s1/` 是未跟踪备份，提交时须排除。

## 派发方验收与处置（主会话·2026-11-04）

**结论：通过，合入 main。** 以下为派发方独立实测，不依赖上文自述。

- **全量回归**：`node scripts/validate_atlas.js` exit 0（约 52 秒）；四套 fork 测试与 `sync_version --check` 重跑全过。
- **清单**：在临时目录重新生成，四份产物与仓库逐字节相同；独立比对 old 290／new 323，消失 1（Namhan 旧指纹），新增 34，同 ID 条目 0 改动。`data/sam/**` 的 `supersedes` 全为空数组，无 BLOCKING。
- **真实浏览器（Chromium，真实数据与 demo 两套）**：
  - URL：改年份后研究参数保留，改写后的编码 URL 刷新可恢复；无研究参数时 URL 为 `?year=1600`，且无研究组和面板。
  - 地形×研究真值表四行全对。demo 数据：开开＝研究组有要素、旧河道 256 条（压制 2 条）；开关＝无要素、258 条；关开＝有要素、旧河道组 `display:none`；关关＝无要素。
  - 地形关闭时改年份：1950 无要素，回 1938 恢复，§3 第三行成立。`chk-terrain` 真实点击也已验。
  - 投影：真实数据的点相对南京标注的方位与经纬差相符。
- **未验**：移动端、研究点的鼠标命中。
- **处置**：
  - 单中 MCP 的 #174 是派发方笔误，`UPSTREAM_TRACKING` 已改回 #172。
  - 单中把 `is-hidden` 判断称作 hover，也是派发方措辞不准，以本报告实测为准。
  - 「上游丢弃扩展研究参数」不收入 UPSTREAM_FEEDBACK：上游没有承诺保留第三方参数，属 fork 自身的适配，已由包装解决。
  - 测试局限：§3 的跨年测试是在测试内模拟 `jumpToYear` 的判断，真实联动以上面的浏览器读数为准。

S1 DONE
