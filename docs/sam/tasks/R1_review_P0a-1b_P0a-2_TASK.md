# 审核单 R1｜P0a-1b 与 P0a-2 交付物审查

- task_id：`jsm-r1-review`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Sol
- 建立：2026-10-23；状态：active

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. 两张被审任务单：`docs/sam/tasks/P0a-1b_pairing_fix_TASK.md`、`docs/sam/tasks/P0a-2_contract_validator_TASK.md`。
3. 不运行 `git status` / `git diff` / `git log` 以外的全库扫描；不 commit；读大文件用行号区间。本次在 vault 外运行，vault guard 不在场。

## 1. 审查对象

自 commit `c2b35f0` 以来的全部改动（`git diff c2b35f0` 加上未跟踪的新文件），即：

- P0a-1b：`scripts/sam/hydro_inventory.js`、`scripts/sam/hydro_inventory.test.js`、重新生成的 `docs/sam/audit/coherence_probe.json` 与 `P0a-1_INVENTORY.md`
- P0a-2：`scripts/sam/research_contract.js`、`scripts/sam/validate_research.js`、`scripts/sam/validate_research.test.js`、`scripts/sam/fixtures/contract/`、`docs/sam/CONTRACT.md`

两份执行报告（`docs/sam/audit/P0a-1b_REPORT.md`、`P0a-2_REPORT.md`）是执行者的自述。**请先独立读代码、跑代码，最后再读报告**，核对报告里的说法是否成立。

## 2. 要回答的问题

第一问优先于其余各问：

1. **反例**：有没有一种输入，会让这些脚本给出错误的结果，却仍然通过它们自带的测试？给出具体输入，实际运行并附输出。
2. **契约**：`research_contract.js` 的规则里，有没有在某种输入上互相冲突、或该拒绝却放行的情况？给出反例数据。
3. **测试**：哪些测试其实测不到它声称要测的东西（例如无论实现对错都会通过）？
4. **出错即停**：有没有哪条路径在输入不对时静默降级成空集合、默认值或"零条"，而不是报错退出？
5. **规格本身**：两张任务单里有没有写错、自相矛盾、或执行者只能二选一的地方？

不需要评价代码风格。没有发现就写"未发现"，不要为了有内容而凑。

## 3. 严重度（本单自定义，只用这三个词）

- `BLOCKING`：会让错误数据通过校验，或让清点结果错误，且现有测试发现不了。
- `ADVISORY`：有真实缺陷，但当前数据或用法下不会触发，或会被其他检查挡住。
- `COSMETIC`：文字、注释、输出格式问题，不影响结果。

## 4. 写入范围

只允许新建 `docs/sam/audit/R1_REVIEW.md`。需要构造反例文件时放在系统临时目录（`/tmp` 或 `os.tmpdir()`），用完删除；**不得修改任何被审文件**，发现问题只记录，不修。

## 5. 报告格式（`docs/sam/audit/R1_REVIEW.md`）

1. 每条发现：编号、严重度、文件与行号、问题一句话、反例输入、预期结果、实际结果（附运行输出）。
2. 对两份执行报告的核对：哪些说法你实际复现了，哪些没复现或不成立。
3. 一句话回答：**你有没有被这份审核单或执行报告的措辞带动？如实说。**
4. 最后一行：`R1 DONE`。
