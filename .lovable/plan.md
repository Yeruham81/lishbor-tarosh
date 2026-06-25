# Legal docs + Cookie consent integration

## New files
- `src/content/legal.ts` — Hebrew text constants for Privacy Policy, Terms of Use, and Cookie Notice (extracted from the uploaded DOCX files, structured as sections for clean rendering).
- `src/components/LegalModal.tsx` — Reusable shadcn `Dialog` with a scrollable RTL content area, rendering a title + structured sections. Closes via outside click, Esc, or close button (Dialog defaults).
- `src/components/CookieConsentBanner.tsx` — Fixed bottom banner shown only when `localStorage["cookie_consent_v1"]` is missing.
  - Body: full text from "הודעת שימוש בעוגיות" + inline link "מדיניות פרטיות" that opens the Privacy Policy modal.
  - Buttons: **אישור הכל** (saves `{essential:true, analytics:true, advertising:true}`) and **ניהול העדפות** (opens preferences modal).
  - Preferences modal: 3 toggles — חיוניות (locked on, disabled), ניתוח, פרסומות + "שמירה" / "אישור הכל" actions.
  - All choices persisted to `localStorage` under `cookie_consent_v1` with timestamp + version; banner hides after save.

## Footer changes (`src/components/AppShell.tsx`)
Center column currently holds only "יצירת קשר". Replace it with a flex row containing three buttons in this order (RTL visual order — between יצירת קשר and יציאה as requested):
1. יצירת קשר (existing Link)
2. מדיניות פרטיות (button → opens Privacy modal)
3. תנאי שימוש (button → opens Terms modal)

All three share identical styling: `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium`. On narrow screens the row wraps. Privacy/Terms get small icons (`ShieldCheck`, `FileText`) matching the existing icon pattern.

Mount `<CookieConsentBanner />` once inside `AppShell` so it appears on every page.

## Modal/banner UX details
- Hebrew-only labels, `dir="rtl"`.
- Modal max height ~80vh, inner `overflow-y-auto`, section headings styled with existing display font + sunset gradient accent, paragraphs use `whitespace-pre-wrap` and `leading-relaxed`.
- Banner: `fixed bottom-0 inset-x-0 z-50`, card surface, border-top, max-width container, stacks vertically on mobile.
- Cookie preferences modal reuses `LegalModal`'s Dialog primitives but with custom body (toggles via existing `Switch` component if present, else styled checkboxes).

## Out of scope
- No actual analytics/ads gating wiring — only consent capture. (Can wire later when AdSense/Analytics scripts are added.)
- Email contact line in Privacy Policy ("[יושלם בהמשך]") rendered as-is per source doc.
