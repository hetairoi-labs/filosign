# Filosign Client Audit Report

## Anti-Patterns Verdict

**PASS** - This does NOT look AI-generated. The codebase shows deliberate design decisions:

- **Distinctive visual identity**: Uses a unique lime-green (#d1f5ae) accent color that's uncommon in AI-generated designs
- **Custom design system**: Well-structured CSS variables in `globals.css` with semantic token naming
- **Purposeful typography**: Manrope + Inter font pairing (not the generic Inter-only approach)
- **Bento grid layout**: Thoughtful asymmetric card layout on landing page, not the typical hero-metric-template
- **Signature-specific features**: Custom handwritten font classes and document signing UI that's domain-specific

---

## Executive Summary


| Metric           | Count                                  |
| ---------------- | -------------------------------------- |
| **Total Issues** | 48 errors, 2 warnings                  |
| **Critical**     | 0                                      |
| **High**         | 12 (Accessibility)                     |
| **Medium**       | 24 (TypeScript/any types, performance) |
| **Low**          | 14 (Semantic HTML suggestions)         |


**Most Critical Issues:**

1. **Interactive divs without ARIA roles** - 8 locations prevent keyboard navigation
2. **Explicit `any` types** - 18+ locations reduce type safety
3. **Missing dependency arrays** - 4 useCallback/useEffect issues cause stale closures

**Overall Quality Score: 7/10**

- Design system: 8/10 (well-structured tokens)
- Accessibility: 5/10 (keyboard navigation gaps)
- Type Safety: 6/10 (too many `any` types)
- Performance: 7/10 (minor memoization issues)

**Recommended Next Steps:**

1. Fix keyboard navigation on interactive elements (high user impact)
2. Replace `any` types with proper interfaces
3. Audit color contrast ratios for WCAG compliance

---

## Detailed Findings by Severity

### Critical Issues

*None found*

---

### High-Severity Issues

#### A11Y-001: Interactive Elements Without Keyboard Support


|                    |                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Location**       | `FileViewer.tsx:357`, `DocumentViewer.tsx:297,323,363`, `add-sign/index.tsx:365`                           |
| **Severity**       | High                                                                                                       |
| **Category**       | Accessibility                                                                                              |
| **Description**    | `div` elements with `onClick` handlers lack `role`, `tabIndex`, and keyboard event handlers                |
| **Impact**         | Users navigating by keyboard cannot interact with document viewer, signature placement, or modal backdrops |
| **WCAG**           | WCAG 2.1 Level A - 2.1 Keyboard Accessible                                                                 |
| **Recommendation** | Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space                              |
| **Command**        | `/harden`                                                                                                  |


#### A11Y-002: SVGs Without Accessible Titles


|                    |                                                                 |
| ------------------ | --------------------------------------------------------------- |
| **Location**       | `ErrorBoundary.tsx:49,78`, `01-intro-slide.tsx:39`              |
| **Severity**       | High                                                            |
| **Category**       | Accessibility                                                   |
| **Description**    | Decorative SVGs lack `<title>` elements or `aria-label`         |
| **Impact**         | Screen readers cannot describe icons to visually impaired users |
| **WCAG**           | WCAG 2.1 Level A - 1.1.1 Non-text Content                       |
| **Recommendation** | Add `<title>Error icon</title>` inside SVGs                     |
| **Command**        | `/harden`                                                       |


#### A11Y-003: Non-Focusable Interactive Elements


|                    |                                                                        |
| ------------------ | ---------------------------------------------------------------------- |
| **Location**       | `breadcrumb.tsx:54`, `carousel.tsx:122,159`                            |
| **Severity**       | High                                                                   |
| **Category**       | Accessibility                                                          |
| **Description**    | Elements with `role="link"` and `role="region"` are not focusable      |
| **Impact**         | Keyboard users cannot navigate to breadcrumb pages or carousel regions |
| **WCAG**           | WCAG 2.1 Level A - 2.1.1 Keyboard                                      |
| **Recommendation** | Add `tabIndex={0}` or use semantic `<a>` elements                      |
| **Command**        | `/harden`                                                              |


#### TYP-001: Explicit `any` Types in Profile Components


|                    |                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Location**       | `AccountPreferencesSection.tsx:42`, `PinChangeSection.tsx:20`, `ProfilePictureSection.tsx:14`, `PersonalInfoSection.tsx:21` |
| **Severity**       | High                                                                                                                        |
| **Category**       | Type Safety                                                                                                                 |
| **Description**    | `form: any` props disable TypeScript checking for form methods                                                              |
| **Impact**         | Runtime errors from incorrect form field access; lost IntelliSense                                                          |
| **Standard**       | TypeScript Best Practices                                                                                                   |
| **Recommendation** | Define `ProfileForm` interface and use `form: UseFormReturn<ProfileForm>`                                                   |
| **Command**        | `/harden`                                                                                                                   |


---

### Medium-Severity Issues

#### PERF-001: Missing useCallback Dependencies


|                    |                                                                             |
| ------------------ | --------------------------------------------------------------------------- |
| **Location**       | `DocumentViewer.tsx:143`, `add-sign/index.tsx:365`                          |
| **Severity**       | Medium                                                                      |
| **Category**       | Performance                                                                 |
| **Description**    | `useCallback` missing `documentWidth`, `documentHeight` in dependency array |
| **Impact**         | Stale closure bugs; drag handlers use outdated dimensions after resize      |
| **Standard**       | React Hooks Rules                                                           |
| **Recommendation** | Add all used values to dependency array or use refs for mutable values      |
| **Command**        | `/optimize`                                                                 |


#### TYP-002: `any` Types in Permission System


|                    |                                                                       |
| ------------------ | --------------------------------------------------------------------- |
| **Location**       | `permissions/index.tsx:108,113,122,210,260,261,323,385,386`           |
| **Severity**       | Medium                                                                |
| **Category**       | Type Safety                                                           |
| **Description**    | Approval and request objects typed as `any`                           |
| **Impact**         | No compile-time checking for status fields; potential runtime crashes |
| **Recommendation** | Define `Approval` and `Request` interfaces                            |
| **Command**        | `/harden`                                                             |


#### TYP-003: Array Index as React Key


|                    |                                                                     |
| ------------------ | ------------------------------------------------------------------- |
| **Location**       | `permissions/index.tsx:212,263,325,388`, `trusted-companies.tsx:81` |
| **Severity**       | Medium                                                              |
| **Category**       | Performance                                                         |
| **Description**    | Using array index as `key` prop in mapped lists                     |
| **Impact**         | Unnecessary re-renders; incorrect component state preservation      |
| **Standard**       | React Best Practices                                                |
| **Recommendation** | Use unique IDs from data (e.g., `approval.id`, `req.id`)            |
| **Command**        | `/optimize`                                                         |


#### A11Y-004: Form Labels Without Control Association


|                    |                                                                   |
| ------------------ | ----------------------------------------------------------------- |
| **Location**       | `Crop.tsx:234`                                                    |
| **Severity**       | Medium                                                            |
| **Category**       | Accessibility                                                     |
| **Description**    | `<label>` lacks `htmlFor` attribute; ToggleGroup lacks `id`       |
| **Impact**         | Screen readers cannot associate label with control                |
| **WCAG**           | WCAG 2.1 Level A - 1.3.1 Info and Relationships                   |
| **Recommendation** | Add `id="aspect-ratio-toggle"` to ToggleGroup, `htmlFor` to label |
| **Command**        | `/harden`                                                         |


#### PERF-002: Missing useEffect Dependency


|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| **Location**       | `Upload.tsx:15-17`                                                         |
| **Severity**       | Medium                                                                     |
| **Category**       | Performance                                                                |
| **Description**    | `props.setImage` used but `props` not in dependency array                  |
| **Impact**         | Stale closure if component re-renders with different props                 |
| **Recommendation** | Destructure `setImage` at component level: `function Upload({ setImage })` |
| **Command**        | `/optimize`                                                                |


#### TYP-004: Unused Function Parameters


|                    |                                                            |
| ------------------ | ---------------------------------------------------------- |
| **Location**       | `AccountPreferencesSection.tsx:51`                         |
| **Severity**       | Medium                                                     |
| **Category**       | Code Quality                                               |
| **Description**    | `form` parameter declared but not used in component body   |
| **Impact**         | Confusing API; suggests functionality that doesn't exist   |
| **Recommendation** | Remove unused parameter or prefix with underscore: `_form` |
| **Command**        | `/deslop`                                                  |


---

### Low-Severity Issues

#### SEM-001: Semantic HTML Suggestions (Non-Breaking)


|                    |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Location**       | `carousel.tsx:122` (role="region" → `<section>`), `carousel.tsx:159` (role="group" → `<fieldset>`) |
| **Severity**       | Low                                                                                                |
| **Category**       | Accessibility                                                                                      |
| **Description**    | ARIA roles could be replaced with semantic HTML elements                                           |
| **Impact**         | Minor; semantic HTML improves screen reader experience                                             |
| **Recommendation** | Change `<div role="region">` to `<section>`, `<div role="group">` to `<fieldset>`                  |
| **Command**        | `/normalize`                                                                                       |


#### TYP-005: Slider Thumb Array Index Keys


|                    |                                                               |
| ------------------ | ------------------------------------------------------------- |
| **Location**       | `slider.tsx:53`                                               |
| **Severity**       | Low                                                           |
| **Category**       | Performance                                                   |
| **Description**    | Slider thumbs use array index as React key                    |
| **Impact**         | Acceptable here - thumbs don't reorder, but still flagged     |
| **Recommendation** | Consider using value as key if stable: `key={_values[index]}` |
| **Command**        | N/A (acceptable pattern)                                      |


#### LOG-001: Case Mismatch in Switch Statement


|                    |                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Location**       | `permissions/index.tsx:50-72`                                                        |
| **Severity**       | Low                                                                                  |
| **Category**       | Logic                                                                                |
| **Description**    | `status.toLowerCase()` followed by uppercase case labels (`"PENDING"`, `"ACCEPTED"`) |
| **Impact**         | Switch cases never match; badges always show default variant                         |
| **Recommendation** | Change to lowercase: `case "pending":`, `case "accepted"`, etc.                      |
| **Command**        | `/harden`                                                                            |


---

## Patterns & Systemic Issues

### Recurring Problem: Keyboard Accessibility

**8 locations** have interactive `div` elements without proper ARIA attributes. This suggests:

- Need for reusable `ClickableDiv` or `Button` component that handles ARIA automatically
- Developer education on keyboard navigation requirements

### Recurring Problem: `any` Type Usage

**18 locations** use explicit `any`. Pattern shows:

- API response types not properly defined
- Form handling without proper TypeScript generics
- Quick development at expense of type safety

### Recurring Problem: useCallback Dependencies

**4 locations** have incomplete dependency arrays. Common in:

- Drag-and-drop handlers
- Document viewer interactions
- Need for ESLint rule enforcement

---

## Positive Findings

### Design System Excellence

- **Well-structured tokens**: CSS variables follow consistent naming (`--color-`*, `--radius-*`)
- **Proper font loading**: Multiple handwritten signature fonts preloaded
- **Glass utility**: Reusable `glass` utility class for consistent backdrop effects
- **Tailwind v4**: Using modern `@theme` and `@utility` directives

### Component Architecture

- **shadcn/ui foundation**: Standardized on accessible Radix-based components
- **Custom Image component**: Wraps images with proper loading states
- **Motion integration**: Consistent `motion/react` usage for animations
- **Form handling**: React Hook Form with Zod validation throughout

### Responsive Design

- **Container queries**: Using `@md:` breakpoint syntax (Tailwind v4 container queries)
- **Mobile-first**: Document signing interface adapts with `isMobile` detection
- **Flexible layouts**: Sidebar + inset pattern for dashboard

### Security Consciousness

- **KEM encryption**: Proper ciphertext handling in file operations
- **World ID integration**: Proof verification for document signing
- **PIN authentication**: Onboarding flow with PIN setup

---

## Recommendations by Priority

### Immediate (This Week)

1. **Fix keyboard navigation** on all 8 interactive divs (A11Y-001, A11Y-003)
2. **Fix case mismatch** in permissions switch statement (LOG-001)
3. **Add SVG titles** to ErrorBoundary icons (A11Y-002)

### Short-Term (Next Sprint)

1. **Replace `any` types** in profile components (TYP-001)
2. **Fix useCallback dependencies** in DocumentViewer (PERF-001)
3. **Use unique keys** in permission lists (TYP-003)

### Medium-Term (Following Sprint)

1. **Define API interfaces** for permissions and approvals (TYP-002)
2. **Semantic HTML cleanup** in carousel components (SEM-001)
3. **Form label associations** in Crop component (A11Y-004)

### Long-Term

1. **Create reusable accessible components**: `KeyboardDiv`, `AccessibleIcon`
2. **Add a11y testing**: Playwright + axe-core for CI
3. **TypeScript strict mode**: Enable `noImplicitAny` gradually

---

## Suggested Commands for Fixes


| Issue Category         | Command      | Expected Result                                |
| ---------------------- | ------------ | ---------------------------------------------- |
| Accessibility gaps     | `/harden`    | Adds ARIA roles, keyboard handlers, SVG titles |
| TypeScript `any` types | `/harden`    | Interfaces defined, types strictened           |
| Performance hooks      | `/optimize`  | Dependency arrays fixed, memoization added     |
| Code cleanup           | `/deslop`    | Unused code removed, imports organized         |
| Semantic HTML          | `/normalize` | shadcn patterns applied consistently           |
| Design polish          | `/polish`    | Spacing, alignment, visual refinements         |


---

## Appendix: Current Error Count Summary


| Rule                          | Count  | Severity |
| ----------------------------- | ------ | -------- |
| `noStaticElementInteractions` | 8      | High     |
| `useKeyWithClickEvents`       | 6      | High     |
| `noExplicitAny`               | 18     | Medium   |
| `noArrayIndexKey`             | 6      | Medium   |
| `useExhaustiveDependencies`   | 4      | Medium   |
| `noSvgWithoutTitle`           | 2      | High     |
| `useFocusableInteractive`     | 1      | High     |
| `useSemanticElements`         | 3      | Low      |
| **Total**                     | **48** | -        |


---

*Report generated: 2026-03-14*  
*Scope: packages/client/src/*