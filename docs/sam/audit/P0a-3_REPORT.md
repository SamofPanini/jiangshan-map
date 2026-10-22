# P0a-3 execution report

## 交付物清单

- `index.html`：仅在 `js/app.js` 后新增任务单指定的两行脚本标签；`git diff -- index.html` 全文见下。
- `js/sam/research_layer_core.js`：Node/浏览器共用纯函数，包含 URL 参数、半开区间、压制集、legacy 漂移、revision 掩码与 GeoJSON SVG path 逻辑。
- `js/sam/research_layer.js`：在实例化前包装 `_hydroMask` 与 `_buildTerrainRivers`；加载、契约校验、legacy 漂移停机、SVG 绘制、状态横幅与复选框均在此文件。为不超出 `index.html` 两行白名单，core 由该脚本在解析期同步载入。
- `scripts/sam/research_layer_core.test.js`：新增纯函数测试，包含真实 `js/china_geo_data.js` 的 VM 加载和演示数据的漂移检查。
- `scripts/sam/fixtures/research_demo/demo_synthetic.geojson`、`demo_sources.json`：3 个 synthetic draft feature；1938–1947 的方波 LineString、一个 unknown 年代 feature、一个 null geometry feature。替代的 legacy id 是 `river:Huang:84327c8013cf`（inventory river index 168，`Huang`，rank 1，appear 1855，vanish null）。

## 验证结果（逐项）

1. `node --check js/sam/research_layer_core.js && node --check js/sam/research_layer.js && node --check scripts/sam/research_layer_core.test.js`

   通过（无输出，exit 0）。

2. `node scripts/sam/research_layer_core.test.js`

   ```text
   PASS research-layer core: params + intervals + suppression + drift + masks + geometry paths + real HYDRO_DATA
   ```

   覆盖：无/单/双 URL 参数、拒绝外部/绝对/`..` 路径、`[1938,1947)` 边界、open/unknown 端点、可见性决定压制集、关闭图层恢复旧条目、真实 inventory 与 `HYDRO_DATA` 无漂移、篡改 `vanish` 产生指名 drift、revision/年份掩码变化、LineString 与带洞 Polygon path。

3. `node scripts/sam/validate_research.js --data scripts/sam/fixtures/research_demo/demo_synthetic.geojson --sources scripts/sam/fixtures/research_demo/demo_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`

   ```text
   READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=b268f9b43142d47b105247e280beb1dea90cf61823045eb6fa1460938d078530 features=3 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=15f5140df9ac3185c5d706a2b3c0f97bc577b640303b8bcc54ce93e7d8604201 legacy_count=290 stage=draft synthetic=true
   WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
   WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
   WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
   WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
   ```

   exit 0；4 条 warning 是 synthetic draft fixture 的契约允许警告，非 error。

4. `node scripts/sam/validate_research.test.js`

   ```text
   PASS valid + 21 invalid fixtures + CLI fail-closed + determinism + direct API + browser export + documentation parity
   ```

5. `node scripts/sam/hydro_inventory.test.js`

   ```text
   hydro_inventory.test.js: 14 required cases passed
   ```

6. `git diff -- index.html`（全文）

   ```diff
   diff --git a/index.html b/index.html
   index 085aea1..b4aa401 100644
   --- a/index.html
   +++ b/index.html
   @@ -698,5 +698,7 @@
      <script src="js/map_data.js?v=20261021e"></script>
      <script src="js/lore_data.js?v=20261021e"></script>
      <script src="js/app.js?v=20261021e"></script>
   +  <script src="scripts/sam/research_contract.js?v=sam1"></script>
   +  <script src="js/sam/research_layer.js?v=sam1"></script>
    </body>
    </html>
   ```

7. `node scripts/validate_atlas.js`

   未通过（exit 1）：

   ```text
   AssertionError [ERR_ASSERTION]: Cache-busting ?v= query strings must be uniform across index.html (?v=20261021e,?v=sam1) and js/app.js (?v=20261021e)
   ```

   这是任务单要求新增的精确 `?v=sam1` 两行与既有上游校验“全站 `?v=` 必须和 `js/app.js` 相同”之间的冲突；未改任务单外的 `js/app.js` URL 或校验器。

8. 浏览器内行为：待主会话浏览器终验，未在本环境声称验证。建议在静态服务器启动后访问：

   `http://localhost:8000/?research=scripts/sam/fixtures/research_demo/demo_synthetic.geojson&research_sources=scripts/sam/fixtures/research_demo/demo_sources.json`

   在年份 1940，预期横幅显示 `sam-research-demo-synthetic`、`demo-r1`、`draft`、醒目的 `SYNTHETIC / 非史料`；可见 feature 计数 2（其中 null geometry 不绘制），年代未知未显示 1，压制旧条目 1，方波线出现且 1855 后 `Huang` 旧条目被压制。取消“显示研究图层”后，方波线隐藏、旧 `Huang` 恢复、压制数变为 0；切到 1947 后方波消失，旧条目恢复。还应检查浏览器控制台无 fetch/contract/drift error，且 URL 只带一个 research 参数时显示“研究图层未启用”。

9. 本单里的数与你实测有出入吗？有：任务单要求的 `?v=sam1` 与当前 `validate_atlas.js` 的统一 cache-busting 断言冲突，故该回归不能 exit 0。演示数据实测为 3 features、1 source、290 legacy entries；任务单未给出冲突以外的具体预期计数。

## 规格偏差

- `node scripts/validate_atlas.js` 未通过，原因见验证第 7 项；按白名单和精确两行要求，未将 `js/app.js?v=20261021e` 改为其他版本、也未修改上游校验器。需主会话裁定：允许将这两行版本号改为 `20261021e`，或调整上游校验器以允许 Sam 扩展版本号。
- 演示资料的要求文本 `synthetic demo geometry for layer mechanics, not historical` 放在 GeoJSON 顶层 `meta.description`。契约严格限制 Feature `properties` 的键集合，不允许单独的 feature `description`；把它放进 feature properties 会使 `validate_research.js` 报 `E_UNKNOWN_KEY`。这是为满足“必须通过 validator”采取的保守位置。
- 已知设计脆弱点：因为 `index.html` 白名单只准两个 script 标签，`research_layer.js` 在 HTML 仍处于解析期以 `document.write` 同步加载 core，确保 core 在 `DOMContentLoaded` 实例化前可用。若未来调用顺序改为把该脚本设为 `defer`/module，或在 document 完成解析后才动态注入，它会在 core 未同步可用时提前返回，因而不会包装原型；届时需在白名单中显式允许 `<script src="js/sam/research_layer_core.js">` 置于胶水脚本前，不能继续依赖当前加载顺序。

P0a-3 DONE
