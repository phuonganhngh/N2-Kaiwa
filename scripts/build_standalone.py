"""Build a self-contained, directly openable HTML edition. No server required."""
import json
import re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
css = (root / 'styles.css').read_text()
core = (root / 'core.js').read_text().replace('export function ', 'function ')
app = (root / 'app.js').read_text()
app = re.sub(r'^import .*?;\n', '', app, count=1)
old = """    const responses = await Promise.all([fetch('./data/grammar.json'),fetch('./data/exercises.json')]);
    if (responses.some(r => !r.ok)) throw new Error('Local data could not be loaded.');
    [source, bank] = await Promise.all(responses.map(r => r.json())); grammar = source.entries;"""
new = """    const bundled = JSON.parse(document.getElementById('bundled-data').textContent);
    source = bundled.source; bank = bundled.bank; grammar = source.entries;"""
assert old in app
app = app.replace(old,new)
app = app.replace('Serve the project with a static web server (npm start), rather than opening index.html as a file. Reload to retry.','This standalone file includes all data. Reload to retry.')
data = json.dumps(dict(source=json.loads((root/'data/grammar.json').read_text()),bank=json.loads((root/'data/exercises.json').read_text())),ensure_ascii=False).replace('<','\\u003c')
html = re.sub(r'  <link rel="icon"[^\n]+\n','',html)
html = re.sub(r'  <link rel="stylesheet" href="./styles\.css(?:\?[^"]*)?">', lambda _: '  <style>\n'+css+'\n  </style>', html)
html = re.sub(r'  <script type="module" src="./app\.js(?:\?[^"]*)?"></script>', '', html)
html = html.replace('href="./"','href="#"')
assert '</script' not in core.lower() and '</script' not in app.lower()
html = html.replace('</body>','<script type="application/json" id="bundled-data">'+data+'</script>\n<script>\n(()=>{\n'+core+'\n'+app+'\n})();\n</script>\n</body>')
output = root/'N2-Kaiwa-standalone.html'
output.write_text(html)
print(output)
print(output.stat().st_size,'bytes; CSS, JavaScript, and all 214 exercises embedded.')
