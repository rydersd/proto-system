# Nib

**Plan the experience before you build it. Get alignment. Build it right the first time.**

Nib is a wireframe prototyping framework designed to be read by AI agents — specifically [Claude Code](https://claude.ai/claude-code). You define your project data — pages, personas, user flows, design stories — and Claude reads the framework's reference docs to generate a complete, navigable prototype with design notes, implementation tracking, and living documentation. The output is HTML that anyone on the team can open in a browser and understand.

**Nib is the instruction set. Claude Code is the engine.** The framework alone doesn't generate anything — it provides the design system, components, tokens, and conventions that an agent needs to produce consistent, self-documenting wireframes.

Think of it as a functional Google Design Sprint that lives in a repo.

## The Problem It Solves

This isn't a new story. Healthcare.gov launched after $1.7 billion in development and crashed on day one — built by teams that never tested the end-to-end experience. Snapchat redesigned their app in 2018 without meaningful user validation and lost $1.3 billion in market value when users revolted. It happens at every scale: teams build what seems right under deadline pressure, skip the experience planning, and spend the next year fixing things that could have been avoided.

The wireframes that were supposed to prevent this either didn't get made (no time), got made but weren't detailed enough (lorem ipsum and gray boxes), or got made but nobody could follow them without the designer in the room to explain.

Nib started because I was in a meeting trying to explain a partner portal ecosystem to a service designer helping with onboarding. I could talk through the big picture, but I couldn't get into the weeds on the personas, the flows, the implementation approach — not in any format someone could pick up and run with. An outside firm was coming in to make recommendations. I needed something they could riff on without me. Not a slide deck. Not a Figma file that requires everyone to have an account and navigate a tool they might not know.

I needed a prototype that explained itself.

## What It Produces

A nib project generates a set of linked HTML pages that anyone can open in a browser:

- **Sitemap** — visual information architecture showing every page, organized by section
- **Wireframe pages** — interactive layouts with real labels, real data patterns, and design notes explaining every decision
- **Jobs to Be Done** — persona-specific user goals consolidated from design notes across all pages
- **User Flows** — step-by-step journey visualizations showing how personas move through the system
- **Personas** — character cards and organizational context for guided walkthroughs
- **Design Stories** — living implementation tracking with phased delivery, acceptance criteria, platform approach, and decision logs

Every page has a design notes panel that explains *why* it exists, *who* it serves, and *how* it should be built. Agents read the framework's reference docs and generate pages that are consistent with your design tokens, component library, and project conventions — without you having to re-explain the standards every time.

## Who It's For

- **Designers** who want to validate an experience before handing it off, and need the connective tissue (sitemaps, flows, personas) that usually gets skipped
- **Product owners** who need stakeholders to see and agree on what's being built before development starts
- **Engineers** who want wireframes with actual implementation context — not just pictures, but phased approach (OOB vs. config vs. custom), acceptance criteria, and platform suggestions
- **Leadership** who want to understand what a project delivers without scheduling a 30-minute walkthrough
- **Outside firms and new team members** who need to understand the system from scratch, without the original designer in the room

## How It Works

You need [Claude Code](https://claude.ai/claude-code) (or another frontier model agent) to generate pages. The framework provides three things the agent reads:

1. **Reference docs** (`ref/`) — agent-readable documentation covering design tokens, components, layouts, navigation, and platform conventions. Claude reads these before generating any page.
2. **Core CSS + JS** (`core/`) — shared design system with a fidelity slider (napkin sketch → blueprint → polished), paper aesthetic, and interactive chrome (navigation drawer, design notes panel, guided walkthroughs).
3. **Starters** (`starters/`) — copy-paste HTML templates for every page type. Define your project data, copy a starter, and Claude generates the rest.

### Project data drives everything

Your project is defined in one file — `project-data.js` — which sets up:

```javascript
SECTIONS        // Pages and navigation structure
STORY_MAP       // Which design stories apply to which pages
DESIGN_STORIES  // Rich implementation tracking (phases, acceptance criteria, decisions)
JOURNEYS        // User flow definitions
SCENARIOS       // Guided walkthrough scripts
```

Agents read this data and the reference docs to generate pages that are internally consistent — the sitemap reflects SECTIONS, the design notes reference the right personas, the AC badges link to the right design stories.

## Quick Start

### Recommended: Git submodule (stays up to date)

```bash
# Create your project repo
mkdir my-project && cd my-project && git init

# Add nib as a submodule
git submodule add https://github.com/rybooth/nib.git nib
git commit -m "Add nib framework"
```

```
my-project/
├── nib/                ← submodule (don't modify — updates from upstream)
│   ├── core/
│   ├── surfaces/
│   ├── starters/
│   └── ref/
├── pages/
│   ├── project-data.js ← your project's data
│   ├── project.css     ← your project's custom styles
│   └── [pages].html    ← generated from starters
└── reviews/            ← review annotations (pulled from API)
```

1. Add nib as a submodule (above)
2. Copy `nib/starters/project-data.js` to `pages/` and define your `SECTIONS`
3. Copy a starter page from `nib/starters/` to `pages/` and customize
4. Pages reference `../nib/core/proto-core.css` and `../nib/core/proto-nav.js`
5. Open in a browser — navigation, design notes, and fidelity controls work immediately

**To update nib** when new features land:

```bash
cd my-project
git submodule update --remote nib
git add nib
git commit -m "Update nib framework"
```

### Alternative: Copy (for simple projects or no-git environments)

Copy `core/` and `surfaces/` directly into your project. Pages reference `core/proto-core.css` etc. with no `nib/` prefix. You'll need to manually re-copy when nib updates.

For the full bootstrap process, read `ref/new-project.md`.

## Agent Compatibility

Nib is built and tested with [Claude Code](https://claude.ai/claude-code). The reference docs, CLAUDE.md instructions, and prompting conventions are written for Claude's agent loop. Other frontier models can read the reference docs and generate pages, but you'll need to adapt the agent instructions and prompting patterns for your model of choice.

If you get Nib working with another agent or model, please contribute your adapter instructions back. The goal is for this framework to work everywhere — PRs with agent-specific guidance (Cursor rules, Copilot instructions, etc.) are very welcome.

## Key Concepts

**Design tokens, not hex values.** Every color is a CSS custom property (`--wf-ink`, `--wf-accent`, `--wf-surface`, etc.). Change the token, change every page.

**Surfaces for platform context.** Building a Salesforce wireframe? Load `surfaces/salesforce.css` and get SLDS-aware components. Slack? Load `surfaces/slack.css`. Internal portal? `surfaces/internal-ds.css`. One surface per page.

**Fidelity communicates certainty.** A three-position slider shifts every page between napkin sketch (hand-drawn feel), blueprint (balanced wireframe), and polished (clean, precise). Use `data-wf-confidence` on any element to visually flag uncertain features.

**Design stories track implementation.** Each story has a user story statement, acceptance criteria, phased implementation approach (OOB / Config / Custom LWC), decision log, and optional platform suggestions. The Design Stories page auto-generates a roadmap, metrics, and validation warnings from this data.

**Everything explains itself.** Every wireframe page includes a design notes panel with context (what and why), design specification (how it works), and technical details (how to build it). Stakeholders don't need a walkthrough — they can read the notes.

## Structure

```
nib/
├── core/           Shared CSS modules + JS (do not modify per-project)
│   ├── proto-core.css        Design tokens + base components
│   ├── proto-nav.js          Navigation engine, design notes, walkthroughs
│   ├── proto-gen.js          Declarative page renderer
│   └── proto-stories.js      Design stories page renderer
├── surfaces/       Platform CSS overlays
│   ├── salesforce.css        SFDC record pages, path bar, feed
│   ├── slack.css             Slack app shell, messages, threads
│   └── internal-ds.css       Portal KPIs, form groups, cards
├── ref/            Agent reference docs (read before building)
├── starters/       Copy-paste templates for every page type
└── examples/       Reference implementations
```

## Design Token Palette

| Token | Use |
|-------|-----|
| `--wf-ink` | Headings, borders |
| `--wf-text` | Body text |
| `--wf-accent` | The ONE blue — links, active states |
| `--wf-surface` | Card backgrounds |
| `--wf-canvas` | Page background |
| `--wf-green` | Success, confirmed, OOB approach |
| `--wf-amber` | Warnings, pending, config approach |
| `--wf-red` | Errors, overdue, custom dev approach |
| `--wf-purple` | AI, suggestions |

## License

MIT
