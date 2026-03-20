# Slack Audit Knowledge — Slack Design System

> Component inventory, token map, and classification guidance for auditing `surfaces/slack.css`.

---

## Slack Block Kit Component Inventory

These are the real Slack UI components. Nib selectors that map to these are classified as **OOB**.

### App Shell

| Slack Component | Nib Selector(s) | Notes |
|----------------|-----------------|-------|
| App Layout | `.slack-app` | Root flex container |
| Icon Rail | `.slack-rail`, `.slack-rail-workspace`, `.slack-rail-icon` | Left-most vertical nav strip |
| Sidebar | `.slack-sidebar`, `.slack-sidebar-header`, `.slack-sidebar-section`, `.slack-sidebar-channel` | Channel list sidebar |
| Main Panel | `.slack-main`, `.slack-main-header` | Primary content area |

### Messages & Threads

| Slack Component | Nib Selector(s) | Notes |
|----------------|-----------------|-------|
| Message | `.slack-message`, `.slack-msg-avatar`, `.slack-msg-author`, `.slack-msg-text`, `.slack-msg-time` | Standard message display |
| Thread | `.slack-thread`, `.slack-thread-header` | Thread panel |
| Message Actions | `.slack-msg-actions` | Hover action bar on messages |
| Reactions | `.slack-reaction`, `.slack-reaction-emoji` | Emoji reactions |

### Block Kit Elements

| Slack Component | Nib Selector(s) | Notes |
|----------------|-----------------|-------|
| Section Block | `.slack-block-section` | Text section |
| Actions Block | `.slack-block-actions` | Button row |
| Divider Block | `.slack-block-divider` | Horizontal rule |
| Context Block | `.slack-block-context` | Small muted text |
| Input Block | `.slack-block-input` | Form input |
| Rich Text Block | `.slack-rich-text` | Formatted text content |

### Interactive Elements

| Slack Component | Nib Selector(s) | Notes |
|----------------|-----------------|-------|
| Button | `.slack-btn`, `.slack-btn-primary`, `.slack-btn-danger` | Block Kit buttons |
| Select Menu | `.slack-select` | Dropdown select |
| Overflow Menu | `.slack-overflow` | Three-dot menu |
| Modal/Dialog | `.slack-modal` | App modal |

### Composer

| Slack Component | Nib Selector(s) | Notes |
|----------------|-----------------|-------|
| Message Composer | `.slack-composer`, `.slack-composer-input`, `.slack-composer-actions` | Message input area |
| File Upload | `.slack-file-upload` | File attachment |

---

## Slack Brand Color Values

Use these to validate polished-mode token overrides.

### Core Colors

| Purpose | Hex Value | Notes |
|---------|-----------|-------|
| Sidebar Dark | `#1a1d21` | Default dark sidebar |
| Sidebar Hover | `#27242c` | Item hover state |
| Sidebar Active | `#1164A3` | Active channel highlight |
| Message Text | `#1d1c1d` | Primary message text |
| Secondary Text | `#616061` | Timestamps, muted text |
| Link Blue | `#1264A3` | Hyperlinks |
| Green (online) | `#007a5a` | Online presence indicator |
| Red (notification) | `#e01e5a` | Notification badges, alerts |
| Yellow (star) | `#e8912d` | Stars, warnings |
| Purple (bot) | `#4a154b` | Slack brand purple |
| White | `#FFFFFF` | Message area background |
| Light Gray | `#F8F8F8` | Hover states, subtle bg |
| Border | `#DDDDDD` | Subtle borders in light theme |

### Dark Theme Values

| Purpose | Hex Value |
|---------|-----------|
| Background | `#1a1d21` |
| Surface | `#222529` |
| Text | `#d1d2d3` |
| Muted text | `#ababad` |
| Border | `#383838` |
| Active | `#1164A3` |

---

## Common False Positives (looks custom, is OOB)

| Selector | Why It's OOB |
|----------|-------------|
| `.slack-rail-workspace` | Standard workspace icon in rail |
| `.slack-msg-actions` | Standard hover action bar |

## Common False Negatives (looks OOB, is custom)

| Selector | Why It's Custom |
|----------|----------------|
| Selectors with project-specific channel names | Domain data in CSS |
| Custom bot message templates | Project-specific bot UI |
