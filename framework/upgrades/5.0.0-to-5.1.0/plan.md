# ADF 5.0.0 → 5.1.0 Upgrade Plan

## Purpose

加入 Project Path Layout 與 opt-in Issue Tracking Integration。

## Compatibility

Issue Tracking 為 Optional Integration。未建立設定檔或 `issue_tracking.enabled: false` 時維持 v5.0 工作流程；只有專案明確啟用 GitLab/GitHub Issue Tracking 時，才要求 integration runtime 與 project config。

## Skill Changes

Issue Tracking 行為只加入：

- adf-develop
- adf-feature-init
- adf-ask
- adf-development-complete
- adf-standard-impact-analysis

其餘 Skill 僅更新 Review Framework 的 project path reference。

## Project Layout

```text
project-root/
├── .adf/
│   ├── VERSION
│   ├── framework/
│   └── templates/
├── standards/
│   ├── development/
│   ├── migration/
│   └── project/
├── modules/
└── src/
```
