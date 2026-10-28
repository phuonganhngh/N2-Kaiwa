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

Speaking questions are newly authored learning material, **not extracted source sentences**. They cover ordinary situations and workplace/formal role-plays where a source expression calls for that register. The exercise model demonstrates one usable form; it does not exhaust every variant listed in a multi-form source entry. Strong expressions are contextualized rather than presented as polite default conversation.

Several source labels are incomplete or inconsistent with their own examples. Entries 6, 114, 143, 157, 173, and 209 have explicit source usage notes in the exercise data and source panel. For example, STT 209's label says `「Vよう」にする` while its example uses `歩くようにしている`. The exercise follows that source example without changing the original label. No source corrections are silently applied.

To repeat the import and verify source fidelity:

```sh
python3 -m pip install openpyxl
python3 scripts/import_grammar.py
python3 tests/source_fidelity.py
npm test
```

The importer does not overwrite the authored question bank. If you replace the workbook, review and update the bank explicitly; the application rejects mismatched STTs or grammar labels.

## Practice

- **Daily:** follows STT order. Days 1–21 have 10 structures each. Day 22 contains the remaining 4; entries are never padded or duplicated.
- **Round 1:** questions 1–5. **Round 2:** questions 6–10. Day 22 has one four-question round. Moving across question 5 automatically updates the round selector.
- **Custom / Adjust grammar:** all 214 structures are listed immediately, grouped by day. Day checkboxes are bulk-select controls, not filters; clearing or unticking a day leaves its grammar visible. You can tick individual structures directly without first choosing a day. Tick D1, D2, … to select every grammar structure in those days. Untick individual entries you already feel confident using. Multiple days are supported, with no ten-entry cap. Partial day checkboxes and counts show your selection. Practice is divided into rounds of five in original STT order; Apply saves the choices, while closing cancels edits. Search also allows individual selection across the bank. Review has been removed.
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

1. Commit the website files and push them to **main** in `phuonganhngh/N2-Kaiwa` (the previously empty repository needs an initial commit).
2. In GitHub, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Open **Actions → Deploy static site to GitHub Pages**. Run it manually, or let the push to main trigger it. Approve the GitHub Pages deployment environment if your repository's rules require it.
4. After the workflow succeeds, use the URL shown by GitHub Pages. Test from that HTTPS URL on iPhone and iPad.

An alternative is Pages “Deploy from a branch” using main / root. The Actions workflow is preferred because it publishes only the website and its JSON files. All asset URLs are relative, so a repository subpath works without configuration. No secrets are needed.

GitHub Pages must be enabled in the repository settings. A successful code push and a successful Pages deployment are separate steps.

## Verification

```sh
npm test                         # Node: data, lessons, randomness, prompt contents
python3 tests/source_fidelity.py # Optional openpyxl: compare every cell with source
# With npm start running, Python Playwright installed, and a browser available:
python3 tests/browser.py
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
data/grammar.json        Immutable source import + source metadata
data/exercises.json      Authored static question bank
source/Grammar-N2.xlsx    Original workbook, for audit/reimport
scripts/                 Workbook importer
tests/                   Source, logic, and browser flow checks
```

Preferences only are saved to this browser's localStorage; prompts, responses, and audio are not persisted. Reset local preferences from How to practice. If storage is unavailable, practice still works. There are no external fonts, analytics, scripts, or runtime network calls except same-origin static files. Initial load requires a static server; offline reload is not promised (no service worker).
