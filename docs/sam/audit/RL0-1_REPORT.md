# RL0-1 执行报告：DILA 寺志 TEI 与许可清点

## 执行报告（固定七项）

- **交付物**：分支 `codex/fosizhi-tei-inventory`；commit SHA 待本报告提交后记录；文件：`scripts/sam/fosizhi_zip_inventory.py`、`scripts/sam/fosizhi_zip_inventory_test.py`、`docs/sam/audit/RL0-1_fosizhi_inventory.json`、`docs/sam/audit/RL0-1_REPORT.md`。
- **验证结果**：测试：`python3 -I scripts/sam/fosizhi_zip_inventory_test.py`，5 tests OK；20 包运行完成、20/20 Range status=ok；`node scripts/validate_atlas.js` exit 0（full validation passed）；git status/commit/push 在最终提交后补录。HTTP 累计下载字节数未能从运行时遥测取得；事后精算 Range 字节时站点返回 503，故该项未检。
- **规格偏差**：报告未能给出 HTTP 层累计字节实测值；METS fileGrp 汇总从已缓存 METS XML 后处理补算。
- **观察回写**：20 包全都有 TEI，与派发背景仅确认 3 包的现状不同；交回任务派发方 Sam’s Agent(Opus-5.5)_steward 复核口径。
- **方法差异审计**：`CANDIDATE`——20/20 包含 TEI，但只有 g017、g032、y109 有大量 `<persName>` / `<placeName>` 标注，其余 TEI 主要有分页/分行及少量日期标记；支持“部分优先解析 TEI、其余仍需 OCR/人工录入”的混合路线。
- **执行者侧推翻条件**：如主会话按同一 Range 方法复核 g032 与一个其他包时，成员 SHA、TEI 结构或目录映射不一致，应撤回汇总结论并重跑。
- **有没有被措辞带动**：有意识到“杭州相关”及“需 OCR”的背景提示；杭州判断仅依 catalog 原始所在地，TEI 标注仅依元素名/计数，没有据背景把 no 改为 yes。

## 汇总表

| ID | 目录题名 | 杭州 | TEI | 人名/地名/时间标注数 | 权威库 ID 属性 | 页码锚形式 | 许可要点 |
|---|---|---|---|---:|---|---|---|
| g007 | Wu lin fan zhi 武林梵志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g015 | Da zhao qing lu si zhi 大昭慶律寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g016 | Chi jian jing ci si zhi 勅建淨慈寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g017 | Yu cen shan hui yin gao li hua yan jiao si zhi 玉岑山慧因高麗華嚴教寺志 | yes | 有 | 1422/1080/253 | 有 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g018 | Feng huang shan sheng guo si zhi 鳳凰山聖果寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g019 | Wu lin li an si zhi 武林理安寺志 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g020 | Long jing jian wen lu 龍井見聞錄 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g021 | Wu lin ling yin si zhi 武林靈隱寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g022 | Zeng xiu yun lin si zhi 增修雲林寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g023 | Xu xiu yun lin si zhi 續修雲林寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g024 | Hang zhou shang tian zhu jiang si zhi 杭州上天竺講寺志 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g025 | Yun ju sheng shui si zhi 雲居聖水寺志 | yes | 有 | 0/0/3 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g026 | Hu pao ding hui si zhi 虎跑定慧寺志 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g027 | Yun qi ji shi 雲棲紀事 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g028 | Long xing xiang fu jie tan si zhi 龍興祥符戒壇寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g029 | Xi xi fan yin zhi 西谿梵隱志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g030 | Chong fu si zhi 崇福寺志 | yes | 有 | 0/0/2 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g031 | Xu chong fu si zhi 續崇福寺志 | yes | 有 | 0/0/1 | 无 | pb@facs, pb@n, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| g032 | Jing shan zhi 徑山志 | yes | 有 | 4639/3987/532 | 有 | pb@n, pb@facs, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |
| y109 | Jing shan ji 徑山集 | no | 有 | 567/500/150 | 有 | pb@n, pb@facs, lb@n | CC BY-SA 3.0 Unported；影印权利未说明 |

20 包中 TEI：20/20。对应站内 13 或 15 部的口径均不吻合。g017、g032、y109 有实体人名/地名标注；其余包虽有 TEI，但没有这两类实体标记。

README/COPYING 未说明影印底本影像权利来源。COPYING 原句（摘录）：“Creative Commons Attribution-ShareAlike 3.0 Unported”。文件授予文本为 CC BY-SA 3.0 Unported，但未见其明确扩展到现代影印底本 JPEG。

**单里给出的数与你实测有出入吗？** 有：20 个包均返回 206 且均含 TEI，和派发说明“仅确认至少 g017、g032、y109、其余待核”不同；各包 Content-Length 与派发清单一致。

## 验证证据

- 测试命令：`python3 -I scripts/sam/fosizhi_zip_inventory_test.py`；输出：`Ran 5 tests ... OK`。
- 实跑命令：`python3 scripts/sam/fosizhi_zip_inventory.py --ids all --base-url https://buddhistinformatics.dila.edu.tw/fosizhi/archives --catalog docs/sam/files/fosizhi/gazetteerCatalog.xml --cache-dir docs/sam/files/fosizhi --out docs/sam/audit/RL0-1_fosizhi_inventory.json`。20 个包均 range_status=ok；HTTP 头样例：`g007_wulinfanzhi.zip`, Content-Length `163348993`, Last-Modified `Thu, 24 Dec 2020 08:09:52 GMT`; 成员数 `1151`。
- Range 下载累计字节数：未检。检查时站点返回 HTTP 503；不能用“远小于 1.37 GB”替代实测。
- `node scripts/validate_atlas.js`：exit 0；`Jiangshan Atlas validation (full) passed`。
- HTTP 请求按顺序执行，间隔至少 1 秒；单成员上限 20 MB；ZIP 图像扩展名 jpg/jpeg/tif/tiff/png 不读取内容。

FOSIZHI-TEI-INVENTORY_DONE
