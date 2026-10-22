# P0a-2b｜R1 审核处置修复执行报告

## 交付物清单

- `scripts/sam/research_contract.js`：R1-01 对畸形 `legacyInventory` fail-closed 并抛出 `TypeError`；R1-03 跳过已判为类型错误的 release claim；R1-05 导出 `STAGES`、`INTERVALS`、`ENDPOINT_STATUSES` 并在校验中使用；末尾同时提供 Node `module.exports` 与浏览器 `globalThis.SamResearchContract`。
- `scripts/sam/hydro_inventory.js`：R1-02 删除 `git_head`、既有输出读取、继承逻辑与空 `catch`，改写 `generator: { path, sha256 }`；R1-04 删除所有半角/全角括号段并保留其后正文。
- `scripts/sam/hydro_inventory.test.js`：新增伪造既有输出不影响 regeneration，以及括号后 `Beta` 由规则 A 配对的反例。
- `scripts/sam/validate_research.test.js`：新增直接 API 畸形 legacy、release `claims: [null]`、无 `module` 的 vm 浏览器导出、枚举文档导出一致性、mini 清点 meta.inputs 与 entries 逐值一致性测试。
- `docs/sam/CONTRACT.md`：新增全部机读枚举表、R1-07 三项裁定、R1-08 错误优先级说明。
- `docs/sam/audit/{hydro_inventory.json,corridor_inventory.json,coherence_probe.json,P0a-1_INVENTORY.md}`：仅通过重跑生成器写入；meta 改为记录生成器路径和 SHA-256，entries 保持不变。
- `scripts/sam/fixtures/contract/legacy_inventory_min.json`：通过 Node 脚本从重新生成的 `hydro_inventory.json` 复制完整 `meta`；三条原有 entries 未重写。

## 验证结果（逐项）

1. 语法检查：

   ```text
   $ node --check scripts/sam/research_contract.js && node --check scripts/sam/hydro_inventory.js && node --check scripts/sam/validate_research.test.js && node --check scripts/sam/hydro_inventory.test.js
   # exit 0
   ```

2. 三套要求中的前两套自带测试：

   ```text
   $ node scripts/sam/hydro_inventory.test.js
   hydro_inventory.test.js: 14 required cases passed

   $ node scripts/sam/validate_research.test.js
   PASS valid + 21 invalid fixtures + CLI fail-closed + determinism + direct API + browser export + documentation parity
   # 两命令均 exit 0
   ```

3. R1-01 原反例：把有效数据的全部 `supersedes` 改为空，并直接传入 `{bad:true}`。输出为：

   ```text
   R1-01 error=TypeError message=legacyInventory must be an object with entries containing string legacy_id values
   ```

4. R1-02 原反例：临时输出目录先放入含 `git_head=FORGED-GIT-HEAD` 的 `hydro_inventory.json` 后重跑生成器。输出为：

   ```text
   R1-02 hydro_inventory.json has_git_head=false generator_sha256=5ff26df96503d1abbfeb5e18462d45eafbe16e9eda8ee7112f547c000d194806
   R1-02 corridor_inventory.json has_git_head=false generator_sha256=5ff26df96503d1abbfeb5e18462d45eafbe16e9eda8ee7112f547c000d194806
   R1-02 coherence_probe.json has_git_head=false generator_sha256=5ff26df96503d1abbfeb5e18462d45eafbe16e9eda8ee7112f547c000d194806
   ```

5. R1-03 原反例：release、non-synthetic 且首个 claim 为 null 的 CLI 输出为结构化错误，不再抛出未捕获异常：

   ```text
   ERROR E_RELEASE /features/0/properties/claims release feature needs a dating claim
   ERROR E_RELEASE /features/0/properties/claims release geometry needs a geometry claim
   ERROR E_TYPE /features/0/properties/claims/0 claim must be an object
   R1-03 exit=1
   ```

6. R1-04 原反例：

   ```text
   R1-04 {"pairings":[{"label_legacy_id":"label:Alpha:aa10be5ab06f","label":{"zh":"Alpha","en":"Alpha (old name) Beta","interval":{"appear":0,"vanish":null}},"candidates":[{"legacy_id":"river:Beta:91c18280e7a5","kind":"river","interval":{"appear":null,"vanish":null},"interval_exact_match":false,"distance_deg":"6.4031","pairing_basis":[{"rule":"A","shared_tokens":["beta"]}]}]}],"unpaired":[]}
   ```

7. R1-05 与 R1-06 原反例：

   ```text
   R1-05 STAGES=["draft","release"] INTERVALS=["half_open"] ENDPOINT_STATUSES=["known","open","unknown"]
   R1-06 meta_inputs_equal=true entries_equal=true full_geo_sha_length=64 mini_geo_sha_length=64
   ```

8. 按任务单 R1-02 entries 比对：

   ```text
   entries_compare hydro_entries_equal=true hydro_legacy_ids_equal=true corridor_entries_equal=true
   ```

9. R1-04 重新生成后的实际配对：

   ```text
   pairings labels=12 candidates=82 unpaired=0 labels_with_text_after_parentheses=0
   ```

   当前 12 条标签都没有括号后的正文；与 R1 记录的 12 条、82 个候选、0 个未配对一致，因此没有须逐条列出的配对变动。

10. 上游回归：

    ```text
    $ node scripts/validate_atlas.js
    ✓ Jiangshan Atlas validation passed in 60187.7 ms:
      - 18 dynasties, 167 snapshots (165 phase-linked), 2430 timeline years swept
      - 15204 historical polygons (2,421,917 vertices) verified lossless & collision-free
      - 35 modern provinces (314 rings)
      - 1387 ancient settlements & 442 historical milestones
      - 7 journeys (68 bilingual stops), 351 era spans, 571 landmark events & 185 gazetteer landmarks verified across 27 E2E CUJs
    # exit 0
    ```

11. 本单里的数与你实测有出入吗？没有：21 个 invalid fixtures、3 个有效样例 feature、3 条 mini legacy entries、12 条 timed label、82 个 candidates、0 个 unpaired 均与任务单/R1 记录一致。生成器测试从既有的 12 required cases 增至 14，是新增两项规定反例的测试计数，不是数据计数偏差。

## 规格偏差

无。R1-07 表中要求同步写入 ROADMAP §4 的三项裁定在本次开工前已存在于该节；该文件不在本任务白名单，故未写入。相同三项裁定已按任务单写入获授权的 `docs/sam/CONTRACT.md`。

按 task-closeout 规程作的只读检查返回 `status_values=[]`、`status_done=false`、`report_found=false`、`ok=false`：本任务单使用的是普通 `状态：active` 文本，且白名单不含任务单本身，故本次不能把它改为 list-form `status: done` 或把报告写回任务单。此项正式关闭回填为待主会话处理的 closure debt；未重跑任何数据写入。

P0a-2b DONE
