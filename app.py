from flask import Flask, g, jsonify, request, send_from_directory       #routing & API routes
import sqlite3, os                                                      #comms to db, handle file paths

APP_DIR = os.path.abspath(os.path.dirname(__file__))
#files for to-do tasks
TASKS_DB_PATH = os.path.join(APP_DIR, 'tasks.db')
TASKS_SCHEMA_PATH = os.path.join(APP_DIR, 'schema_tasks.sql')
#files for user accounts
USERS_DB_PATH = os.path.join(APP_DIR, 'users.db')
USERS_SCHEMA_PATH = os.path.join(APP_DIR, 'schema_users.sql')

app = Flask(__name__, static_folder="static", static_url_path="/static")

def init_db():          #read table, or create one
    #DB for to-do tasks
    if not os.path.exists(TASKS_DB_PATH):
        db = sqlite3.connect(TASKS_DB_PATH)
        with open(TASKS_SCHEMA_PATH, "r") as f:
            db.executescript(f.read())
        db.commit()
        db.close()
        print("Created tasks.db")

    #DB for user accounts
    if not os.path.exists(USERS_DB_PATH):
        db = sqlite3.connect(USERS_DB_PATH)
        with open(USERS_SCHEMA_PATH, "r") as f:
            db.executescript(f.read())
        db.commit()
        db.close()
        print("Created users.db")

#DB init
with app.app_context():
    init_db()

#DB helpers for to-do tasks
def get_tasks_db():
    if 'tasks_db' not in g:
        g.tasks_db = sqlite3.connect(TASKS_DB_PATH)
        g.tasks_db.row_factory = sqlite3.Row
    return g.tasks_db

#DB helper for user accounts (g obj = per req db conn)
def get_users_db():
    if 'users_db' not in g:
        g.users_db = sqlite3.connect(USERS_DB_PATH)
        g.users_db.row_factory = sqlite3.Row
    return g.users_db

@app.teardown_appcontext
def close_db(exception):
    db_task = g.pop('tasks_db', None)
    if db_task is not None:
        db_task.close()
    db_user = g.pop('users_db', None)
    if db_user is not None:
        db_user.close()


#To-Do tasks API Routes
@app.get("/api/tasks")
def get_tasks():
    db = get_tasks_db()
    rows = db.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/tasks")
def add_task():
    data = request.json
    print("DEBUG: Received data ->", data)  #this will print in terminal
    if not data or "title" not in data:
        return jsonify({"error": "Invalid input"}), 400

    db = get_tasks_db()
    db.execute(
        "INSERT INTO tasks (title, due_date, due_time, completed, priority) VALUES (?, ?, ?, 0, ?)",
        (data["title"], data.get("due_date"), data.get("due_time"), data.get("priority", "Low"))
    )
    db.commit()
    return jsonify({"status": "ok"}), 201

@app.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    data = request.json
    db = get_tasks_db()

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
    db = get_tasks_db()
    db.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    db.commit()
    return jsonify({"deleted_id": task_id})

#User Accounts API Routes   
@app.post("/api/signup")    #(create new user)
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    name = data.get("name")

    if not username or not password or not name:
        return jsonify({"error": "Please fill out all fields"}), 400

    db = get_users_db()

    #check if username exists
    existing = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        return jsonify({"error": "This username already exists"}), 400

    #insert new user
    db.execute("INSERT INTO users (username, password, name) VALUES (?, ?, ?)", (username, password, name))
    db.commit()

    return jsonify({"status": "ok"}), 201


@app.post("/api/login")     #auth user
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username or Password is missing"}), 400

    db = get_users_db()
    user = db.execute(
        "SELECT * FROM users WHERE username=? AND password=?", (username, password)
    ).fetchone()

    if not user:
        return jsonify({"error": "Invalid username or password."}), 401

    return jsonify({"user": dict(user)}), 200

#Update user profile
@app.put("/api/update_user/<int:user_id>")
def update_user(user_id):
    data = request.json
    username = data.get("username")
    password = data.get("password")
    name = data.get("name")

    db = get_users_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404

    #check username for dupes
    if username and username != user["username"]:
        existing = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        if existing:
            return jsonify({"error": "Username already taken"}), 400

    #dynamic update query
    db.execute("""
        UPDATE users
        SET username = COALESCE(?, username),
            password = COALESCE(?, password),
            name = COALESCE(?, name)
        WHERE id = ?
    """, (username, password, name, user_id))
    db.commit()

    updated_user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return jsonify({"user": dict(updated_user)}), 200

#Password recovery
@app.post("/api/recover")
def recover_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("new_password")

    db = get_users_db()
    user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    if not user:
        return jsonify({"error": "No account found for this username"}), 404

    db.execute("UPDATE users SET password=? WHERE username=?", (new_password, username))
    db.commit()

    return jsonify({"status": "Password updated successfully"}), 200


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
