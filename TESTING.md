# Verification and device checklist

## Current automated checks

- Node: 5 grammar logic cases plus 8 user-data/backup validation cases. Grammar cases covering all 214 source-linked exercises, lesson/round selection, eligible unique random sets, exact copied fields, and model-answer exclusion.
- Source fidelity: all four columns for every numbered entry and all 10 unnumbered notes match the archived workbook exactly.
- Chromium + Playwright: 71 assertions passed for each edition (modular site and standalone HTML). The browser suite checks English/hint defaults, independent Japanese reveals, navigation, daily/final/custom rounds, Copy 1/5/10 counts and exact questions, preview-before-copy, unique random sets, source-order Custom practice, and no model answers in prompts.
- Only Daily and Custom remain. No Review tab, Shortcut links, or Practice-in-ChatGPT actions remain.
- All 214 structures appear immediately in Custom with no day selected. Individual selection works directly; Clear selection and unticking a day retain the complete list.
- Day selection checks: D1 selects 10; D1+D2 selects 20; individual untick gives a partial D1 indicator with no per-day count labels; practice skips the unticked entry; removing D2 preserves D1; D22 selects exactly 4. Multi-day selections persist across reload, and canceled edits do not overwrite saved selections.
- Custom random 10Q defaults to the selected structures, excluding unticked ones. Fewer than 10 disables copy and explains the limit instead of duplicating entries. Entire bank remains an explicit alternative.
- Successful copy only shows a confirmation, with no additional dialog or automatic app launch. Clipboard denial exposes the complete selectable prompt for manual copying. Preferences are optional when localStorage is unavailable.
- Layout checks at 1440px desktop, 390px iPhone-sized, 768px iPad-sized, and 320px small mobile. No horizontal page/dialog overflow; day checkboxes have at least 44px-high touch targets. These are Chromium checks, not actual Safari/device certification.
- Playwright WebKit download was denied by the environment's egress policy (`cdn.playwright.dev`). Actual Safari remains untested.

Browser tests deliberately mock clipboard success/denial. Actual Safari permissions and pasting into ChatGPT require device testing. Tests are run for both the modular site and the rebuilt single-file HTML edition.

## Manual Kaiwa and backup verification

- A separate 43-assertion Chromium suite exercises manual add/edit/delete, cancel deletion, topic search, review-status filters, reviewed flags, reload persistence, migration of legacy preferences, and exact Daily and Custom grammar-position resume.
- It downloads an actual JSON file and restores it in a separate fresh browser context. Canceled imports do not change data; selecting the same file again works. Japanese, meanings, replies, reviewed flags, Custom choices and lesson position survive the transfer.
- Foreign/malformed files are rejected; storage-write failure leaves current state unchanged. A markup-containing entry is rendered literally rather than executed; extra grammar fields cannot replace the source bank.
- A storage-denied browser can still add a session-only entry and download it, with a visible warning.
- Notebook controls and editor were checked at 390px, 768px and 320px. These are Chromium layouts, not native Safari tests.
- Unit tests cover invalid dates/IDs, future formats, oversized files, whole-record restore failure, protected unreadable existing data, and preserving another tab's newly added notes during a preference update.

## Run

```sh
npm test
python3 tests/source_fidelity.py
# Start npm start in another terminal first:
python3 tests/browser.py
python3 tests/notebook_browser.py
python3 scripts/build_standalone.py
N2_TEST_URL=http://127.0.0.1:8000/N2-Kaiwa-standalone.html python3 tests/browser.py
N2_TEST_URL=http://127.0.0.1:8000/N2-Kaiwa-standalone.html python3 tests/notebook_browser.py
```

Optional Python dependencies: openpyxl for source audit; Playwright and Chromium for browser testing. Neither is required by website visitors. Screenshots go to `/tmp/n2-test-results`.

## Safari on actual iPhone and iPad — pending

- [ ] Japanese renders correctly in portrait/landscape and at larger system text sizes.
- [ ] Only Daily/Custom tabs are visible. Clicking Custom opens the day selector.
- [ ] Tick D1/D2; grammar below is selected. Untick individual entries. Day partial state updates; day chips display only D1, D2, … without counts.
- [ ] Untick a whole day; other days retain their choices. D22 includes four entries.
- [ ] Apply a multi-day selection; navigate across rounds. Unticked entries never appear.
- [ ] Cancel edits and reload; saved selections remain intact. Search can select individual grammar across the bank.
- [ ] Copy 1Q and 5Qs: success notification only; no Shortcut window. Paste into ChatGPT manually.
- [ ] Copy 10Qs: preview first; inspect, copy, and paste. No duplicates or model answers.
- [ ] Custom random set excludes unchecked entries; insufficient selection produces a clear message.
- [ ] Test long 10Q clipboard contents for truncation, then test denied clipboard permission/manual fallback.
- [ ] Independent Japanese reveals reset on navigation; Day 22 has four exercises.
- [ ] Screen-reader labels, keyboard focus, modal closure, and visible status feedback work.
- [ ] Private browsing/storage restrictions do not prevent practice.
- [ ] Send copied prompt in ChatGPT; start Voice manually if desired. Check exact order, one question at a time, hints, Vietnamese feedback, repeat, and next commands. External ChatGPT behavior cannot be enforced by this site.

## Additional iPhone/iPad device checks — pending

- [ ] Daily Kaiwa stays separate; adding/editing Japanese and optional replies/meanings works with the native keyboard.
- [ ] Date controls, editor scrolling, review flags, search, and deletion confirmation are touch-friendly in portrait/landscape.
- [ ] Download Progress saves a complete JSON file to Files (or use Share → Save to Files if Safari opens it).
- [ ] Transfer the file to another device; Update Progress can select it from Files and display the preview.
- [ ] Confirm restoration; verify exact notes, reviewed flags, Custom choices and grammar question position on the receiving device.
- [ ] Cancel or select an invalid file: existing notes remain unchanged. Download current data from the preview before replacing it.
- [ ] If storage is unavailable, the visible warning appears and a session backup remains downloadable.
