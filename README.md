# N2 Controlled Kaiwa Trainer

A mobile-first static speaking trainer. All **214 grammar entries** and **214 authored exercises** are local JSON. No runtime dependencies, AI APIs, backend, database, authentication, or cloud synchronization. The site itself never accesses the microphone or calls ChatGPT.

## Run locally

From the checkout:

```sh
cd /workspace/N2-Kaiwa
npm start
```

On your own computer, run from wherever you cloned this repository. Python 3 is required for the static server; Node 18+ provides the optional npm commands and tests. You can also run `python3 -m http.server 8000` directly without Node. Open the server's port 8000 in your local browser. Use a web server, rather than opening `index.html` with `file://`, because the app loads local JSON using `fetch`.

No `npm install` or build is needed. Any static server works. GitHub Pages supplies HTTPS, which is required for normal clipboard access outside localhost. On an iPhone accessing a computer's plain HTTP LAN address, the manual clipboard fallback may be needed.

## Workbook and data provenance

The attachment **Grammar N2.xlsx contains one worksheet, named `Sheet`**, not “Sheet 2”. The sole sheet has 225 rows: one header, 214 numbered entries, and 10 unnumbered notes. No nonexistent second sheet was fabricated.

| Source column | JSON field | Treatment |
| --- | --- | --- |
| STT | `stt` | Original integer, 1–214 |
| Cấu trúc ngữ pháp | `structure` | Exact cell text, including line breaks and unusual labels |
| Nghĩa | `meaning` | Exact Vietnamese text; missing STT 157 meaning remains `null` |
| Ví dụ | `examples` | Exact examples, punctuation, line breaks, and date annotations |

- `source/Grammar-N2.xlsx`: unchanged archived attachment.
- `data/grammar.json`: source headers, SHA-256 checksum, original row numbers, all entries, and all 10 unnumbered notes. Source notes stay attached to the preceding STT.
- `data/exercises.json`: one exercise per STT, with exact `targetGrammar`, English question, Japanese question, short English keyword hint, Japanese model answer, and optional context/source usage notes.
- `scripts/import_grammar.py`: deterministic importer. Requires `openpyxl` only for reimporting, never for running the website.

Speaking questions are newly authored learning material, **not extracted source sentences**. English questions are reviewed against their Japanese questions for meaning and conversational phrasing. English hints intentionally use short natural keyword phrases and arrows, rather than complete translations of the model answers. They cover ordinary situations and workplace/formal role-plays where a source expression calls for that register. The exercise model demonstrates one usable form; it does not exhaust every variant listed in a multi-form source entry. Strong expressions are contextualized rather than presented as polite default conversation.

Several source labels are incomplete or inconsistent with their own examples. Entries 6, 114, 143, 157, 173, and 209 have explicit source usage notes in the exercise data and source panel. For example, STT 209's label says `「Vよう」にする` while its example uses `歩くようにしている`. The exercise follows that source example without changing the original label. No source corrections are silently applied.

To repeat the import and verify source fidelity:

```sh
python3 -m pip install openpyxl
python3 scripts/import_grammar.py
python3 tests/source_fidelity.py
npm test
```

The importer does not overwrite the authored question bank. If you replace the workbook, review and update the bank explicitly; the application rejects mismatched STTs or grammar labels.

See [CONTENT_REVIEW.md](CONTENT_REVIEW.md) for the complete-unit review criteria and explanations of the revised speaking scenarios. Automated tests verify behavior and data fidelity; they do not establish linguistic quality.

## Practice

- **Daily:** follows STT order. Days 1–21 have 10 structures each. Day 22 contains the remaining 4; entries are never padded or duplicated.
- **Round 1:** questions 1–5. **Round 2:** questions 6–10. Day 22 has one four-question round. Moving across question 5 automatically updates the round selector.
- **Custom / Adjust grammar:** all 214 structures are listed immediately, grouped by day. Day checkboxes are bulk-select controls, not filters; clearing or unticking a day leaves its grammar visible. You can tick individual structures directly without first choosing a day. Tick D1, D2, … to select every grammar structure in those days. Untick individual entries you already feel confident using. Multiple days are supported, with no ten-entry cap. Compact D1, D2, … checkboxes show partial-day selection without extra counts. Practice is divided into rounds of five in original STT order; Apply saves the choices, while closing cancels edits. Search also allows individual selection across the bank. Review has been removed.
- **Grammar covered through:** inclusive learning boundary for random sets in Daily mode. Initially Day 1; adjust it to your actual progress. “Mark this day covered” advances the boundary without reducing it.
- English questions and keyword hints are visible. Japanese questions and answers have independent toggles, both reset to hidden on navigation.
- Original grammar, meaning, examples, and source notes remain available under “Original source & notes”.

## Three copy modes

| Button | Selection | Copy behavior |
| --- | --- | --- |
| **Copy 1Q** | Current exercise | Copies one complete Voice prompt and shows a brief confirmation |
| **Copy 5Qs** | Currently selected round, in its displayed order | Copies five, or the actual available count for a short final/custom round; count is displayed |
| **Copy 10Qs** | Ten unique random exercises | First generates and displays a preview. “Copy this 10Q set” copies that exact set and shows a brief confirmation |

Random sets in Daily default to covered grammar. In Custom they default to exactly the selected structures, excluding all unticked entries. If fewer than 10 are selected, copying a random 10Q set is disabled with an explanation; select more or explicitly choose another pool. The preview allows **Entire grammar bank** as an explicit alternative. Random selection does not change the learner's coverage. “Generate another set” reshuffles; no exercise can repeat within a selection. The preview shows all questions and hints before copying.

Every successful Copy action shows a brief confirmation, with no Shortcut or handoff dialog. Open ChatGPT yourself and paste the prompt. If automatic copying fails, a manual-copy dialog provides the entire selectable prompt. Every prompt includes numbered exercises, original STT, exact target grammar, exact Japanese and English questions, exact English keyword hints, and complete Controlled Speaking Level 2 instructions. Prompts use an explicit field allowlist: model answers, workbook examples, and source meanings are never copied.

Voice instructions require one Japanese question at a time, an original learner response, and the exact order. They request short English hints for `ヒントをください`, Vietnamese feedback for `フィードバックお願いします`, repetition for `もう一度`, and advancement only for `次の問題`. Feedback considers grammar, naturalness, and speaking independence. These are instructions for ChatGPT; the website cannot enforce another application's responses.

## Simple manual ChatGPT workflow

1. Press **Copy 1Q**, **Copy 5Qs**, or preview and copy **10Qs**.
2. Open ChatGPT yourself, paste the prompt, and send it.
3. Start Voice if you want spoken practice.

No Apple Shortcut is needed and the site never launches another app. If clipboard access fails, select the complete prompt in the manual-copy dialog, copy it yourself, and paste it into ChatGPT.

## Single-file edition

`N2-Kaiwa-standalone.html` includes the CSS, JavaScript, and all JSON data in one file. Rebuild after changing source with `python3 scripts/build_standalone.py`. It needs no application server when opened in a browser that permits local HTML scripts; embedded file viewers may restrict scripts. Source workbook data is unchanged.

## Deploy on GitHub Pages

The included `.github/workflows/pages.yml` validates the bank, prepares only public assets, and deploys a static Pages artifact.

1. Commit the website files and push them to **main** in `phuonganhngh/N2-Kaiwa`.
2. In GitHub, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Open **Actions → Deploy static site to GitHub Pages**. Run it manually, or let the push to main trigger it. Approve the GitHub Pages deployment environment if your repository's rules require it.
4. After the workflow succeeds, use the URL shown by GitHub Pages. Test from that HTTPS URL on iPhone and iPad.

An alternative is Pages “Deploy from a branch” using main / root. The Actions workflow is preferred because it publishes only the website and its JSON files. All asset URLs are relative, so a repository subpath works without configuration. No secrets are needed.

GitHub Pages must be enabled in the repository settings. A successful code push and a successful Pages deployment are separate steps.

## Kaiwa hằng ngày — separate manual collection

Use the **Kaiwa hằng ngày** section beside Ngữ pháp N2. This collection is independent of all 214 source grammar exercises. Personal entries do not appear in Daily, Custom, Copy 1/5/10 prompts, or the authoritative source JSON.

- Add a required Japanese phrase/question, an automatically filled date, and optional topic, meaning (Vietnamese or English), Japanese reply, and notes.
- Edit or delete individual entries; deletion requires confirmation. Cards are grouped by date, newest first.
- Mark **Đã ôn**, filter by reviewed status, or search your own text. Copy on a personal card copies that card's Japanese text/reply, not a grammar Voice prompt.
- Notes and preferences are saved to this browser's localStorage. Existing day/coverage/Custom preferences migrate automatically. Actual lesson question position and the selected section now resume after reloading.
- Reset local preferences resets grammar preferences only; it does not delete personal Kaiwa entries.

### Download / Update tiến độ

1. On the current device, choose **Download tiến độ**. Keep the generated `N2-Kaiwa-tien-do-YYYY-MM-DD.json` file.
2. Transfer it yourself to another device (Files, AirDrop, or your preferred file transfer).
3. Open the website on that device, choose **Update tiến độ**, and select the file.
4. Check the preview, optionally download the destination browser's current data first, then choose **Khôi phục từ tệp**.

Restoration replaces the destination's saved personal collection and preferences; it is not a merge or automatic synchronization. Closing the preview leaves current data unchanged. The backup includes manual entries, dates, meanings, replies, notes, reviewed flags, covered day, full Custom selection, random scope, current grammar mode/question, and active section. It never replaces or exports the source grammar/exercise bank. This is an N2 Kaiwa backup format, not an importer for another application's files.

Safari may download directly to Files or show the JSON document. If it opens the document, use **Share → Save to Files**, then select that file via Update tiến độ on the destination device. No Apple Shortcut is required.

File validation rejects foreign formats, unsupported versions, invalid dates/positions, duplicate IDs, missing fields, oversized text, or a file larger than 4 MiB. Each backup supports up to 1,000 personal entries. Validation completes before any data is written; restoration writes one storage record and leaves the current state intact if persistence fails. Imported text is rendered as plain text. Unexpected source-grammar fields are ignored and cannot modify the static bank.

If browser storage is denied or full, newly entered notes remain usable in the current session and a visible warning asks you to download before leaving. Do not rely on them surviving a reload. A restore requiring durable storage reports failure rather than claiming it saved. An unreadable existing notebook is not silently overwritten. Preference updates in another tab preserve the latest personal collection in the same browser.

## Verification

```sh
npm test                         # Node: data, lessons, randomness, prompt contents
python3 tests/source_fidelity.py # Optional openpyxl: compare every cell with source
# With npm start running, Python Playwright installed, and a browser available:
python3 tests/browser.py
python3 tests/notebook_browser.py   # real downloads + restore in a fresh browser
# Optional: install WebKit, then run the same browser flows:
python3 -m playwright install webkit
N2_BROWSER=webkit python3 tests/browser.py
```

Browser tests prefer system Chromium, otherwise Playwright's Chromium. Install the optional test dependency with `python3 -m pip install playwright`, then `python3 -m playwright install chromium`. None of these tools is shipped to the client. Browser screenshots go to `/tmp/n2-test-results`.

See [TESTING.md](TESTING.md) for verified results and the required device testing checklist. Browser tests mock clipboard success and denial to verify both control paths. They do not prove real Safari clipboard permission or native Safari clipboard permissions.

## Architecture

```text
index.html + styles.css   Accessible responsive interface, local system fonts
app.js                   State, DOM, optional localStorage, copy and manual-paste fallback
core.js                  Pure lesson, round, random selection and prompt functions
progress.js              User-data schema, validation, storage migration and backup handling
notebook.js              Separate manual Kaiwa UI and JSON download/restore
data/grammar.json        Immutable source import + source metadata
data/exercises.json      Authored static question bank
source/Grammar-N2.xlsx    Original workbook, for audit/reimport
scripts/                 Workbook importer
tests/                   Source, logic, and browser flow checks
```

Preferences and explicitly entered personal Kaiwa are saved to this browser's localStorage; microphone audio and ChatGPT responses are not captured. User data is stored separately from the immutable grammar bank. Reset local preferences from How to practice; personal entries remain. If storage is unavailable, practice still works, and manual entries can be downloaded from the current session. There are no external fonts, analytics, scripts, or runtime network calls except same-origin static files. Initial load requires a static server; offline reload is not promised (no service worker).
