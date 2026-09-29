# ADF 5.0.0 → 5.1.0 Upgrade Plan

## Purpose

加入 Project Path Layout 與 opt-in Issue Tracking Integration。

## Compatibility

`issue_tracking.enabled: false` 時維持 v5.0 工作流程。

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
