# Verify Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/verify` page into a modern public verification flow with strong light-mode readability.

**Architecture:** Keep the current React route and API flow. Redesign the page shell, the verification form, the loading state and the result state without adding dependencies.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3, lucide-react, TanStack Query already present in the project.

---

### Task 1: Page Shell

**Files:**
- Modify: `frontend/src/features/verify/VerifyPage.tsx`

- [ ] Replace the simple centered layout with a full public portal shell.
- [ ] Keep `BrandLockup`, `ThemeToggle`, home link and Android APK download.
- [ ] Add a right-side visual treatment explaining the signal flow.

### Task 2: Verification Panel

**Files:**
- Modify: `frontend/src/features/verify/VerifySignalPanel.tsx`

- [ ] Preserve existing API calls and validation rules.
- [ ] Split the form into message, context fields and evidence upload.
- [ ] Replace the loading overlay with an inline premium analysis state.
- [ ] Rework the result section around score, risk level, highlighted message, advice and report CTA.

### Task 3: Highlighted Message

**Files:**
- Modify: `frontend/src/features/verify/HighlightedMessage.tsx`

- [ ] Remove broken mojibake text and emoji tooltips.
- [ ] Improve contrast for light and dark themes.
- [ ] Keep tooltip semantics and span slicing behavior.

### Task 4: Verification

**Files:**
- Test: frontend build

- [ ] Run `npm.cmd run build` from `frontend`.
- [ ] Fix TypeScript or Vite errors if any.
