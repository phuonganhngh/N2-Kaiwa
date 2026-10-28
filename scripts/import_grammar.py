"""Reimport the exact source cells. Requires openpyxl; never rewrites exercises."""
import hashlib
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'source/Grammar-N2.xlsx'
workbook = openpyxl.load_workbook(source, data_only=False)
sheet = workbook.worksheets[0]  # The supplied workbook has one sheet, not Sheet 2.
headers = [cell.value for cell in sheet[1]]
assert headers == ['STT', 'Cấu trúc ngữ pháp', 'Nghĩa', 'Ví dụ']
entries, notes = [], []
for row_number, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):
    stt, structure, meaning, examples = row
    if stt is not None:
        assert isinstance(stt, int) and structure
        entries.append(dict(stt=stt, structure=structure, meaning=meaning,
                            examples=examples, sourceRow=row_number))
    elif any(value is not None for value in row):
        notes.append(dict(sourceRow=row_number, afterStt=entries[-1]['stt'],
                          cells=list(row)))
assert [e['stt'] for e in entries] == list(range(1, 215))
result = dict(sourceFile=source.name, sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
              sheet=sheet.title, requestedSheet='Sheet 2',
              sourceNote='The supplied workbook contains only one worksheet: Sheet. All numbered entries are imported from it verbatim.',
              headers=headers, entries=entries, notes=notes)
(ROOT / 'data/grammar.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(f'Imported {len(entries)} grammar entries and {len(notes)} unnumbered source notes from {sheet.title}.')
