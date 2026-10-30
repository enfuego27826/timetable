"""Build the browser-only timetable for GitHub Pages."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd
from jinja2 import Environment, FileSystemLoader, select_autoescape
from csv_filter import TIMETABLE_SOURCE, load_timetable


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / 'static', output / 'static', dirs_exist_ok=True)
    shutil.copyfile(TIMETABLE_SOURCE, output / 'source-timetable.csv')
    courses = []
    for _, row in load_timetable().iterrows():
        if pd.isna(row['Credit']):
            continue
        def value(key):
            return '' if pd.isna(row.get(key)) else str(row[key])
        courses.append({
            'code': value('Course Number'), 'name': value('Course Name'),
            'credits': float(row['Credit']), 'instructor': value('Instructor'),
            'plan_link': value('Course Plan'),
            'sessions': [
                {'type': kind, 'slots': [slot.strip() for slot in value(kind + ' Time').split(',') if slot.strip()],
                 'location': value(kind + ' Location')}
                for kind in ['Lecture', 'Tutorial', 'Lab']
            ],
        })
    slots = pd.read_csv(ROOT / 'Time Slots.csv').fillna('').to_dict('records')
    (output / 'data.json').write_text(json.dumps({'courses': courses, 'slots': slots}, allow_nan=False), encoding='utf-8')
    env = Environment(loader=FileSystemLoader(ROOT / 'templates'), autoescape=select_autoescape())
    html = env.get_template('index.html').render(
        url_for=lambda endpoint, filename=None: 'static/' + filename if endpoint == 'static' else 'source-timetable.csv'
    )
    html = html.replace('="/static/', '="static/')
    html = html.replace('<script src="static/js/timetable.js">', '<script src="static/js/pages-api.js"></script>\n    <script src="static/js/timetable.js">')
    (output / 'index.html').write_text(html, encoding='utf-8')
    (output / '.nojekyll').touch()
    print(f'Built {len(courses)} courses in {output}')


if __name__ == '__main__':
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist')
