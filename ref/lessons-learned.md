# Lessons Learned

> Root cause documentation from PP-Selfserve Phase 2 implementation. Read this before starting a new project to avoid repeating these mistakes.

## 1. Stale File Copies

**What happened:** pp-selfserve had an old copy of proto-nav.js missing the 3-tab notes split and "Notes" rename.

**Root cause:** No sync mechanism between proto-system source of truth and project copies. Authors copy files once and forget.

**Fix:** Always sync core files from proto-system before making changes. Consider symlinks or a build step.

**Framework instruction:** Before editing any page, verify core/ files match proto-system.

## 2. Wrong WIREFRAME_CONFIG Keys

**What happened:** project-data.js used `projectTitle` and `feedbackMailto` — proto-nav.js expects `title` and `emailRecipient`.

**Root cause:** The config key names weren't documented anywhere. Authors guess based on what seems logical.

**Fix:** Fixed the keys. Added config key reference to navigation.md.

**Framework instruction:** See navigation.md for the complete WIREFRAME_CONFIG key reference with expected types.

## 3. JOURNEYS Object vs Array Mismatch

**What happened:** proto-nav.js loops JOURNEYS with `.length` (array), but pp-selfserve defines it as an object with string keys. Journey features silently break because `JOURNEYS.length === undefined`.

**Root cause:** navigation.md shows JOURNEYS as an array example but doesn't enforce it. The object format is more natural for keyed data.

**Fix:** Added `normalizeJourneys()` that accepts both formats and converts objects to arrays. Docs updated to show both formats.

## 4. Notes Panel Clipping Page Content

**What happened:** Notes panel is position:fixed and overlays content. Opening it clips the wireframe page.

**Root cause:** The panel was designed as a modal overlay (like mobile), not a persistent sidebar. No mechanism to push content left.

**Fix:** Added `html.wf-dn-open` class that sets `body { margin-right: 400px }` with transition.

## 5. Missing SFDC Global Header

**What happened:** Pages had the framework context bar but no Salesforce-style header, confusing reviewers about what's wireframe chrome vs app UI.

**Root cause:** Framework didn't distinguish between "wireframe tools" (context bar, notes, fidelity) and "app chrome" (platform header, nav tabs). No surface-specific header injection.

**Fix:** Added `buildSurfaceHeader()` in proto-nav.js that auto-injects SFDC global header when `type: 'sfdc'` is set on SECTIONS items.

## 6. Story Mode Confusion (Three Overlapping Features)

**What happened:** "Journeys" highlights elements, "Stories" shows Jira badges, "Scenarios" does narrative walkthroughs — but they're presented as separate features with unclear purposes.

**Root cause:** Features were added incrementally without a unifying design. The naming is confusing (wfStory* functions control journeys, not stories).

**Fix:** Unified into single "Stories" button → scenario selector → narrative walkthrough with optional journey highlighting and friction analysis. Jira AC badges moved to Notes Context tab.

## 7. Sitemap Was Hardcoded HTML

**What happened:** index.html had static HTML cards that drifted from SECTIONS when variants were added.

**Root cause:** No guidance that sitemaps should be generated from SECTIONS. The sitemap was hand-authored once and never updated.

**Fix:** Rewrote sitemap as JS-generated from SECTIONS with journey filtering.
