# P0a-1b pairing-rule correction report

## 交付物清单

- 已更新 `scripts/sam/hydro_inventory.js`：规则 A 使用括号外、过滤停用词及单字符 token；加入受任务单限定的 `yellow` -> `huang` 规则 A2；规则 B 改为点到折线/多边形环的平面最短距离；规则 C 要求区间完全相同且满足 B；边界年新增 `is_sentinel` 与 `meaning`。
- 已更新 `scripts/sam/hydro_inventory.test.js`：保留前序 7 项，并新增 5 个可失败断言。
- 已重生 `docs/sam/audit/coherence_probe.json` 与 `docs/sam/audit/P0a-1_INVENTORY.md`。摘要明确距离是经纬度平面近似，非测地距离。
- `hydro_inventory.json` 与 `corridor_inventory.json` 重生后恢复为与 HEAD 逐字节一致，未留下改动；`legacy_id` 未变。

## 验证结果（逐项）

1. `node scripts/sam/hydro_inventory.test.js`

   ```text
   hydro_inventory.test.js: 12 required cases passed
   ```

   覆盖前序 7 项，以及：`Hongze L.` 的单字符 `l` 不触发 A；`Yellow R.` 通过 A2 配 `Huang`；bbox 内但远离 L 形折线不满足 B；同区间但远离几何不满足 C；`9999` 的 `is_sentinel === true`。

2. `node scripts/sam/hydro_inventory.js --geo js/china_geo_data.js --map js/map_data.js --out-dir docs/sam/audit --margin-deg 0.5`

   ```text
   READ geo=js/china_geo_data.js sha256=fbf152b521745917aff59c4d61c4f7e6ef8b80402125977c6023799844476de4 map=js/map_data.js sha256=8fd8cb0fabb6bd201b535867307c3f49a287fb4b1e26393fdf9b8f181fee3684 rivers=187 lakes=62 labels=41 corridors=16
   ```

3. `git diff --exit-code -- docs/sam/audit/hydro_inventory.json docs/sam/audit/corridor_inventory.json`

   ```text
   (no output; exit 0)
   ```

4. HEAD 对比脚本：忽略两个配对节；对 `boundary_years` 移除仅允许的 `is_sentinel`、`meaning` 后逐值对比。

   ```text
   coherence invariant: PASS (only boundary_years fields and pairing sections changed)
   boundary_years=33 sentinel={"year":9999,"is_sentinel":true,"meaning":"open_end","sources":[{"key":"canal_jinghang","endpoint":"span_end","interval":"closed"},{"key":"wall_ming","endpoint":"span_end","interval":"closed"}]}
   ```

5. `node scripts/validate_atlas.js`：已多次启动，但本执行环境的单命令窗口约 30 秒即终止且未返回退出码（没有 stdout/stderr）。因此**未声称通过**；须由主会话在可等待完成的终端执行该命令并确认 exit 0。

实测与任务单数值：12 条 timed label 全部存在（与任务单一致）；旧 7 项加新 5 项测试共 12 项，全部通过。

### 全部 timed-label 候选

格式：`legacy_id | 满足规则 | distance_deg`。距离固定为 4 位小数；`A2` 是固定译名表，`B` 是平面最短距离阈值，`C` 同时表示区间完全相同且满足 B。

- `label:蒲昌海·罗布泊:15a4fad7b0b0`
  - `lake:Lop Nur:4b517c58f936 | A+B+C | 0.0000`
- `label:河水（禹贡故道）:95d5fc59fce8`
  - `river:Huang:3bc797712c20 | A2 | 2.8229`
  - `river:Huang:578a13a5f4d1 | A2+B+C | 0.2125`
  - `river:Huang:754a2dd8dceb | A2 | 3.0689`
  - `river:Huang:759cbe42747f | A2 | 0.6267`
  - `river:Huang:84327c8013cf | A2 | 1.2931`
  - `river:Huang:8ce628579d2b | A2 | 0.9449`
  - `river:Huang:995ee3b69851 | A2 | 4.8077`
  - `river:Huang:b97bb865b483 | A2+B | 0.2434`
  - `river:Huang:ca478d73b103 | A2 | 18.0322`
  - `river:Huang:f0981e7773ba | A2 | 2.7216`
- `label:黄 河（王景故道）:5b192f987075`
  - `river:Huang:3bc797712c20 | A2 | 2.8409`
  - `river:Huang:578a13a5f4d1 | A2 | 1.3675`
  - `river:Huang:754a2dd8dceb | A2 | 3.2117`
  - `river:Huang:759cbe42747f | A2+B | 0.4935`
  - `river:Huang:84327c8013cf | A2+B | 0.1496`
  - `river:Huang:8ce628579d2b | A2+B+C | 0.1874`
  - `river:Huang:995ee3b69851 | A2 | 5.9306`
  - `river:Huang:b97bb865b483 | A2 | 0.9150`
  - `river:Huang:ca478d73b103 | A2 | 18.8522`
  - `river:Huang:f0981e7773ba | A2 | 2.2364`
  - `river:Ji:e48052811063 | B | 0.1874`
- `label:黄 河（北宋北流）:ce0588e08a22`
  - `river:Huang:3bc797712c20 | A2 | 3.1983`
  - `river:Huang:578a13a5f4d1 | A2+B | 0.3412`
  - `river:Huang:754a2dd8dceb | A2 | 3.4702`
  - `river:Huang:759cbe42747f | A2 | 0.5524`
  - `river:Huang:84327c8013cf | A2 | 1.1281`
  - `river:Huang:8ce628579d2b | A2 | 0.8654`
  - `river:Huang:995ee3b69851 | A2 | 5.1031`
  - `river:Huang:b97bb865b483 | A2+B+C | 0.0450`
  - `river:Huang:ca478d73b103 | A2 | 18.4547`
  - `river:Huang:f0981e7773ba | A2 | 3.0201`
- `label:黄 河（夺淮故道）:5391aff5bc09`
  - `lake:Weishan Hu:db35f1373863 | B | 0.4559`
  - `river:Feihuang:411c124f166e | B | 0.1329`
  - `river:Huang:3bc797712c20 | A2 | 1.1690`
  - `river:Huang:578a13a5f4d1 | A2 | 3.4709`
  - `river:Huang:754a2dd8dceb | A2 | 3.7405`
  - `river:Huang:759cbe42747f | A2 | 3.0524`
  - `river:Huang:84327c8013cf | A2 | 2.3407`
  - `river:Huang:8ce628579d2b | A2 | 2.7140`
  - `river:Huang:995ee3b69851 | A2 | 7.2883`
  - `river:Huang:b97bb865b483 | A2 | 2.9961`
  - `river:Huang:ca478d73b103 | A2 | 19.8109`
  - `river:Huang:f0981e7773ba | A2+B+C | 0.1329`
  - `river:Si:008c5794bb47 | B | 0.1329`
  - `river:Si:95b53b6ccacc | B | 0.3920`
- `label:黄 河:1d17e603e785`
  - `lake:Juye Ze:8dfb5a5c82d8 | B | 0.4535`
  - `river:Huang:3bc797712c20 | A2 | 2.4774`
  - `river:Huang:578a13a5f4d1 | A2 | 1.3946`
  - `river:Huang:754a2dd8dceb | A2 | 2.8627`
  - `river:Huang:759cbe42747f | A2 | 0.6502`
  - `river:Huang:84327c8013cf | A2+B+C | 0.0154`
  - `river:Huang:8ce628579d2b | A2+B | 0.3280`
  - `river:Huang:995ee3b69851 | A2 | 5.8847`
  - `river:Huang:b97bb865b483 | A2 | 0.9630`
  - `river:Huang:ca478d73b103 | A2 | 18.6280`
  - `river:Huang:f0981e7773ba | A2 | 1.8618`
  - `river:Ji:e48052811063 | B | 0.0308`
- `label:济 水:cd85cc02ed1b`
  - `river:Huang:84327c8013cf | B | 0.1794`
  - `river:Huang:8ce628579d2b | B | 0.3967`
  - `river:Ji:e48052811063 | A+B | 0.0493`
- `label:大清河:7870606d59b1`
  - `river:Huang:84327c8013cf | B | 0.1794`
  - `river:Huang:8ce628579d2b | B | 0.3967`
  - `river:Ji:e48052811063 | B | 0.0493`
- `label:洪泽:abe4d8ce8a0c`
  - `lake:Gaoyou Hu:b9a32be9d10a | B | 0.3483`
  - `lake:Hongze Hu:68aaac829a28 | A+B+C | 0.0200`
  - `river:Feihuang:411c124f166e | B | 0.0373`
  - `river:Huai:09946cb0fddb | B | 0.1598`
  - `river:Huai:9160decb9731 | B | 0.0943`
  - `river:Huai:c45450a9f014 | B | 0.3111`
  - `river:Huang:f0981e7773ba | B | 0.0373`
  - `river:Si:008c5794bb47 | B | 0.1506`
- `label:巨野泽:c26d59ce785f`
  - `lake:Juye Ze:8dfb5a5c82d8 | A+B | 0.0000`
  - `river:Huang:84327c8013cf | B | 0.3265`
  - `river:Ji:e48052811063 | B | 0.0121`
- `label:梁山泊:e8219459c192`
  - `lake:Juye Ze:8dfb5a5c82d8 | B | 0.0000`
  - `river:Huang:84327c8013cf | B | 0.3265`
  - `river:Ji:e48052811063 | B | 0.0121`
- `label:云梦泽:4289bb370a73`
  - `lake:Hong Hu:89300a685725 | B | 0.3640`
  - `lake:Yunmeng Ze:370978e5de05 | A+B+C | 0.0000`
  - `river:Chang Jiang:a875e9ce3f47 | B | 0.4002`
  - `river:Han:d279761feac9 | B | 0.1172`

`unpaired_timed_labels`：`[]`（无）。

仍明显可疑的机械候选（只记录现象，不改规则）：现代黄河标签 `label:黄 河:1d17e603e785` 与 `lake:Juye Ze:8dfb5a5c82d8` 仅因 B（0.4535°）入选，名称和类型均不同；同一标签与 `river:Ji:e48052811063` 也仅因 B（0.0308°）入选。`label:洪泽:abe4d8ce8a0c` 对 `lake:Gaoyou Hu:b9a32be9d10a` 亦仅因 B（0.3483°）入选。这些是距离阈值造成的邻近水体候选，而非本单允许推断的同一水体结论。

## 规格偏差

无功能规格偏差。为同时满足“重新生成”与两份冻结清单逐字节等同 HEAD 的不变量，生成器在相同输入哈希、计数与生成器标识下保留既有清单的 `meta.git_head` provenance；输入发生变化时仍使用当前 HEAD。上游 `validate_atlas.js` 尚未在本环境取得 exit 0（见验证项 5），需主会话终验。

P0a-1b DONE
