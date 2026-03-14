# SFDC Review Agent Installation

## Quick Install

Copy agent definitions from proto-system to your local Claude config:

```bash
# Create directories
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/skills/sfdc-review-pipeline

# Install agents
cp ref/agent-sfdc-ux.md ~/.claude/agents/sfdc-ux-reviewer.md
cp ref/agent-sfdc-dev.md ~/.claude/agents/sfdc-dev-reviewer.md

# Install skill chain (if available)
cp ref/sfdc-review-pipeline-SKILL.md ~/.claude/skills/sfdc-review-pipeline/SKILL.md
```

## Usage

### Individual agents
```
"Run the sfdc-ux-reviewer agent against home.html and results.html"
"Run the sfdc-dev-reviewer agent against the what-if simulation design notes"
```

### Full pipeline (via skill)
```
/sfdc-review home.html results.html detail.html eligibility.html what-if.html export.html audit.html
```

## What's included

| File | Location | Purpose |
|------|----------|---------|
| `agent-sfdc-ux.md` | `~/.claude/agents/` | SLDS compliance reviewer |
| `agent-sfdc-dev.md` | `~/.claude/agents/` | OOB feasibility reviewer |
| `SKILL.md` | `~/.claude/skills/sfdc-review-pipeline/` | Sequential UX → Dev review pipeline |

## Source of truth

Agent definitions are maintained in `ref/` within the proto-system repository. If you update an agent definition, re-run the copy commands above to sync.
