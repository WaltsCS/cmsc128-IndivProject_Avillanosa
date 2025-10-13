from flask import Flask, g, jsonify, request, send_from_directory
import sqlite3, os

APP_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(APP_DIR, 'tasks.db')
SCHEMA_PATH = os.path.join(APP_DIR, 'schema.sql')

app = Flask(__name__, static_folder="static", static_url_path="/static")

#DB Helpers
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
    if not os.path.exists(DB_PATH):
        db = get_db()
        with open(SCHEMA_PATH, "r") as f:
            db.executescript(f.read())
        db.commit()

with app.app_context():
    init_db()

#API Routes
@app.get("/api/tasks")
def get_tasks():
    db = get_db()
    rows = db.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/tasks")
def add_task():
    data = request.json
    print("DEBUG: Received data ->", data)  #this will print in terminal
    if not data or "title" not in data:
        return jsonify({"error": "Invalid input"}), 400

    db = get_db()
    db.execute(
        "INSERT INTO tasks (title, due_date, due_time, completed, priority) VALUES (?, ?, ?, 0, ?)",
        (data["title"], data.get("due_date"), data.get("due_time"), data.get("priority", "Low"))
    )
    db.commit()
    return jsonify({"status": "ok"}), 201

@app.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    data = request.json
    db = get_db()

    #only update completed if provided
    if "completed" in data:
        db.execute("UPDATE tasks SET completed=? WHERE id=?", (data["completed"], task_id))
    elif "title" in data:  #editing title/dates
        db.execute(
            "UPDATE tasks SET title=?, due_date=?, due_time=?, priority=? WHERE id=?",
            (data["title"], data.get("due_date"), data.get("due_time"), data.get("priority", "Low"), task_id)
        )

    db.commit()
    return jsonify({"status": "ok"})

@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    db = get_db()
    db.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    db.commit()
    return jsonify({"deleted_id": task_id})

#Serve frontend of To-do list
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

#different route from to-do list, for accessing accounts
@app.route("/accounts")
def accounts():
    return send_from_directory("", "accounts.html")


if __name__ == "__main__":
    app.run(debug=True)
