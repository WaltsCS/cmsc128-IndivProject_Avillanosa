from __future__ import annotations
import os, sqlite3, json
from datetime import datetime
from flask import Flask, g, jsonify, request, send_from_directory

APP_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(APP_DIR, 'tasks.db')
SCHEMA_PATH = os.path.join(APP_DIR, 'schema.sql')

app = Flask(__name__, static_folder='static', static_url_path='/static')


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    first_time = not os.path.exists(DB_PATH)
    db = get_db()
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        db.executescript(f.read())
    db.commit()
    if first_time:
        print('Initialized new database at', DB_PATH)

with app.app_context():
    init_db()

def now_iso():
    return datetime.now().isoformat(timespec='seconds')

PRIORITY_ORDER = { 'High': 0, 'Mid': 1, 'Low': 2 }


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})

@app.get('/api/tasks')
def list_tasks():
    sort = request.args.get('sort', 'created')
    order = request.args.get('order', 'asc')

    db = get_db()
    if sort == 'due':
        sort_clause = "COALESCE(due_date,'9999-12-31'), COALESCE(due_time,'23:59')"
    elif sort == 'priority':
        sort_clause = "CASE priority WHEN 'High' THEN 0 WHEN 'Mid' THEN 1 ELSE 2 END"
    else:
        sort_clause = 'created_at'

    dir_clause = 'DESC' if order.lower() == 'desc' else 'ASC'
    rows = db.execute(f"SELECT * FROM tasks ORDER BY {sort_clause} {dir_clause}, id ASC").fetchall()
    tasks = [dict(row) for row in rows]
    return jsonify(tasks)

@app.post('/api/tasks')
def create_task():
    data = request.get_json(force=True)
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    
    priority = data.get('priority') or 'Low'
    if priority not in ('High','Mid','Low'):
        return jsonify({'error': 'invalid priority'}), 400


    due_date = data.get('due_date') or None
    due_time = data.get('due_time') or None
    
    db = get_db()
    cur = db.execute(
        'INSERT INTO tasks(title, priority, due_date, due_time, created_at, completed) VALUES (?,?,?,?,?,0)',
        (title, priority, due_date, due_time, now_iso())
    )
    db.commit()
    new_id = cur.lastrowid
    row = db.execute('SELECT * FROM tasks WHERE id=?', (new_id,)).fetchone()
    return jsonify(dict(row)), 201

@app.put('/api/tasks/<int:task_id>')
@app.patch('/api/tasks/<int:task_id>')
def update_task(task_id: int):
    data = request.get_json(force=True)
    fields = []
    values = []

    for key in ('title','priority','due_date','due_time','completed'):
        if key in data:
            if key == 'priority' and data[key] not in ('High','Mid','Low'):
                return jsonify({'error':'invalid priority'}), 400
            fields.append(f"{key}=?")
            values.append(data[key])

    if not fields:
        return jsonify({'error': 'no fields to update'}), 400
    
    values.append(task_id)
    db = get_db()
    db.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id=?", values)
    db.commit()
    row = db.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
    if not row:
        return jsonify({'error':'not found'}), 404
    return jsonify(dict(row))

@app.post('/api/tasks/<int:task_id>/toggle')
def toggle_task(task_id: int):
    db = get_db()
    row = db.execute('SELECT completed FROM tasks WHERE id=?', (task_id,)).fetchone()
    if not row:
        return jsonify({'error':'not found'}), 404
    new_val = 0 if row['completed'] else 1
    db.execute('UPDATE tasks SET completed=? WHERE id=?', (new_val, task_id))
    db.commit()
    row2 = db.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
    return jsonify(dict(row2))

@app.delete('/api/tasks/<int:task_id>')
def delete_task(task_id: int):
    db = get_db()
    row = db.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
    if not row:
        return jsonify({'error':'not found'}), 404
    db.execute('DELETE FROM tasks WHERE id=?', (task_id,))
    db.commit()
    return jsonify({'deleted_id': task_id})

if __name__ == '__main__':
    app.run(debug=True)