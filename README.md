# ADF Framework

AI Development Framework (ADF) for Claude Code / Codex workflows.

## Core concepts

- ADF Core: framework behavior and review rules
- Project Standards: reusable project-level development and migration standards
- Modules: feature-specific specifications, design, and verification artifacts
- Evidence-first workflow: UNKNOWN and REVIEW_REQUIRED must not be guessed
- Human approval gates before completion

## Recommended project layout

```text
project-root/
├── .adf/
│   ├── VERSION
│   ├── framework/
│   │   ├── review/
│   │   └── integrations/
│   └── templates/
├── standards/
│   ├── development/
│   ├── migration/
│   └── project/
├── modules/
├── src/
├── CLAUDE.md
└── AGENTS.md
```

## Standard authoring

- `adf-standard-authoring` → `standards/development/**`
- `adf-migration-rule-authoring` → `standards/migration/**`
- Project policy/configuration → `standards/project/**`
- Module-specific rules → `modules/{module}/spec/rules.md`
- ADF core changes → framework release + upgrade package

## Issue tracking

ADF keeps issue tracking as an integration layer. GitLab/GitHub labels and workflow mappings are configured per project rather than hard-coded into every skill.
