# 江山时序｜历史 GIS 扩展研究与实现路线图
> **2026-10-23 起，路线图正典改为 [ROADMAP.md](./ROADMAP.md)。** 本文件 §3（阶段规划）与 §4（契约草案）已被取代，仅作历史记录；§1 基线、§2 研究立场、§5 资料线索、§6 禁止事项仍可作背景参考，冲突时以 ROADMAP 为准。
> Sam fork 的非侵入式研究文档。建立：2026-10-22；基于 upstream main `a9cd67c3c4c5eef5902d31104df9b5a7ec83aa0e`。**本文件是计划，非功能已实现声明。**
> 上游：https://github.com/DeanChensj/jiangshan-map ；Fork：https://github.com/SamofPanini/jiangshan-map
> 同步治理见 [UPSTREAM_TRACKING.md](./UPSTREAM_TRACKING.md)。

## 1. 已核实的原项目基线
- 浏览器端纯静态 ES6 + SVG；可直接 `python3 -m http.server 8000`；核心为 `js/app.js`、`js/map_data.js`、`js/china_geo_data.js`、`js/atlas_snapshots.js`；Node 校验 `scripts/validate_atlas.js`。地图重在战国至现代 18 个历史时期的疆域/政区快照、古今地名、事件与人物行迹，并非水文数值模拟。
- `js/china_geo_data.js` 的 `HYDRO_DATA` 包含 rivers、lakes、labels；静态数据可见 187 个河道几何条目、62 个湖泊条目、41 条水文标签（**均不等于独立河流/湖泊个数**）。河道有 rank 与 appear/vanish，地图使用 `_isHydroVisible` 和 `_hydroMask` 控制是否重绘（`js/app.js`），目前主要是离散的阶段几何切换，不是逐年动态复原。
- 黄河代码中的主要切换年为 11、1048、1194、1855（五阶段）；古湖泊示例：云梦泽 vanish=317、巨野泽 vanish=1280、洪泽湖 appear=1194、罗布泊 vanish=1972。**这些是当前可见代码的表达，不能直接等同考证结论**。
- 现有运河/工程走廊与历史事件在 `js/map_data.js` 中，古今透视与地点解析在 UI/atlasAPI 中；可以复用时间轴和地理投影。
- GPL-3.0 见根目录 `LICENSE`；README 说明 CHGIS/Hartwell 衍生历史地理数据另受来源许可约束，部分仅学术、非商业用途。新增数据应单独建 provenance/许可清单；不能推定所有可下载数据可再分发。

## 2. 研究立场：政治时间不等于环境时间
- 分离 `event_year`（史事发生时间）、`geometry_valid_from/to`（地貌复原有效区间）、`observation_date`（史料/测图时间）、`uncertainty_years`（年代不确定幅度）。
- 历史河道应区分：常年主槽、泛滥/分流、季节性河道、废河、人工运河、堤防决口；湖群与湿地不可简单视为某年整片出现或消失。
- 任何叠图应标识 `attested`（有史料证据）、`reconstructed`（研究复原）、`schematic`（示意性展示）、`hypothesis`（待验证）；空间重合不证明因果。
- 现有疆域本身也是历史近似，不宜把古地图叠加产生的视觉精度解释为真实测量精度。

## 3. 阶段规划与验收 Gate
### P0｜水系史料及现有代码审计（先于功能开发）
- [ ] 冻结 upstream SHA，列出 `HYDRO_DATA` 各条河/湖的唯一实体、几何条数、appear/vanish、时间标签、来源与可再分发限制。
- [ ] 核查黄河 11/1048/1194/1855 五阶段是否与所引文献的概念和年代一致；把 1128 vs 1194 等可能不同解释记为 **争议待校勘**，不可默默改写。
- [ ] 检查 1938 花园口决堤至 1947 堵口复归这段地图表达是否缺失；现有黄河主干几何看似未设置该阶段，需证据核验后补充。
- [ ] 确认水文专题数据授权、源地图比例尺、坐标系统、底图配准误差；在每个功能任务前列验收标准和负例。
- Gate：每条拟新增历史河道都有可指认资料（精确页/图/数据集）、空间边界、时间区间、证据等级与可合法使用的许可。

### P1｜黄河时序 PoC（范围限定，不动其他图层）
- [ ] 在 `data/historical_hydro/` 增设原始/标准化分离的 GeoJSON（先小样本）；不直接把手工研究资料混进大型 VLQ 文件。
- [ ] 独立适配层读取 GeoJSON / 简化后的静态 JSON，映射到现有 SVG 投影；原始 `HYDRO_DATA` 留作 fallback。
- [ ] 时间轴按证据年份切换；增加原河道（虚线）/新河道（实线）对照、主槽与泛滥区不同图例。
- [ ] 历史事件与河道选择可互相定位；侧栏点击可显示出处、图像版本与年代置信度。
- Gate：包括 1937/1938/1947/1948 的边界测试、时间轴回归、缩放性能/移动端、旧模式兼容；回滚为禁用扩展图层即可恢复原渲染。

### P2｜江汉平原—云梦泽／长江支流专题
- [ ] 从湖泊 Polygon 切到湖群/湿地/三角洲复合多边形和时间范围；不同学术复原版本可并列/切换。
- [ ] 测试洪泛/湖泊渐进演化与离散战乱事件在不同时序下的表达；对缺测年代提供 uncertainty overlay，不进行伪精确插值。
- Gate：至少两套有来源可追溯的解释版本及并列可见的分歧；支持导出样本数据与文献链接。

### P3｜跨层历史研究（依数据许可和质量逐项推进）
- [ ] 海岸线、河口三角洲／填海；[ ] 古运河与驿路的运输约束；[ ] 城址、迁治与兴废；[ ] 人口/粮赋/农业/水利工程；[ ] 宗教与文化传播网络；[ ] 战乱灾害与迁移；[ ] 考古点位与地貌证据；[ ] 气候与灾害时序。
- Gate：各主题有可比较空间尺度、时间尺度、分母和数据可靠性描述；仅标相关性，不自动输出未经证明的历史因果。

## 4. 建议数据契约（草案）
```json
{
  "id": "huanghe_1938_branch_demo",
  "waterbody_id": "huanghe",
  "feature_type": "river_branch",
  "geometry": {"type": "LineString", "coordinates": []},
  "valid_from": 1938,
  "valid_to": 1947,
  "date_precision": "year",
  "dating_confidence": "review_required",
  "interpretation": "historical_reconstruction",
  "source_refs": [],
  "license_id": null,
  "coordinate_system": "EPSG:4326",
  "georeferencing_error_m": null,
  "review_state": "proposed"
}
```
上面的空 geometry 是 schema 示意，不是有效 GIS 实例；导入时必须校验闭合性/自交、有效坐标、年代区间与引用。

## 5. 候选资料（访问/数据许可待逐项核验）
- [CHGIS 复旦大学历史地理信息系统](https://yugong.fudan.edu.cn/CHGIS/sjxz.htm)：历史政区／特定年份地图与水文图层的调查入口；不等于免费再分发授权。
- [国家地球系统科学数据中心（黄河下游）](https://henu.geodata.cn/feature.html)：近现代黄河下游河道研究数据线索；核对具体数据集、年份与用途。
- [HydroSHEDS](https://www.hydrosheds.org/products)：现代河网/流域空间基线，不是古代河道证据。
- 谭其骧《中国历史地图集》、史地论文、地方志、河务档案、地貌/遥感研究：需精确到图幅、卷页与可引用版本。

## 6. 验收／禁止事项
- 禁止用 AI 猜坐标、猜河道折线后宣称历史真实；禁止用现代河网套进古代年份；禁止对证据不充分的湿地赋单一“消失年”。
- 每次新增同时提交：`data`、`source manifest`、`change log`、`negative tests`、`screenshot before/after` 和 `license review`。
- 保留原生页面 18 时期疆域、点地/点人溯源、快速搜索、CLI、双语与键盘/移动端关键交互；不得牺牲现有行为来换取科研图层。

参考代码：[水文编码数据](../../js/china_geo_data.js) · [前端渲染](../../js/app.js) · [编年和运河](../../js/map_data.js) · [校验](../../scripts/validate_atlas.js)。
