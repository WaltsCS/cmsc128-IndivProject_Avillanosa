from flask import (
    Flask, g, jsonify, request,
    send_from_directory, session, redirect
)
from flask_bcrypt import Bcrypt
import sqlite3, os, json

APP_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(APP_DIR, "app.db"))
SECRET_KEY = os.environ.get("SECRET_KEY", "local-dev-secret-key-change-in-prod")
DEBUG_MODE = os.environ.get("FLASK_DEBUG", "0") == "1"
SCHEMA_PATH = os.path.join(APP_DIR, "schema_app.sql")

app = Flask(__name__, static_folder="static", static_url_path="/static")
bcrypt = Bcrypt(app)
app.secret_key = "change-me-in-prod"   #for session cookies


## ---------------- DB HELPERS ---------------- ##

def init_db():
    """Create app.db from schema_app.sql if it doesn't exist."""
    if not os.path.exists(DB_PATH):
        db = sqlite3.connect(DB_PATH)
        with open(SCHEMA_PATH, "r") as f:
            db.executescript(f.read())
        db.commit()
        db.close()
        print("Created app.db")


with app.app_context():
    init_db()


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


## ---------------- AUTH HELPERS ---------------- ##

def current_user_id():
    return session.get("user_id")


def require_login():
    if not current_user_id():
        return jsonify({"error": "Not authenticated"}), 401


def ensure_personal_list(uid):
    """
    Ensures the logged-in user has exactly ONE personal list.
    """
    db = get_db()
    row = db.execute(
        "SELECT * FROM lists WHERE owner_id=? AND list_type='personal'",
        (uid,)
    ).fetchone()

    if not row:
        db.execute(
            "INSERT INTO lists (name, owner_id, list_type, members) VALUES (?, ?, 'personal', '[]')",
            ("My Tasks", uid)
        )
        db.commit()

        row = db.execute(
            "SELECT * FROM lists WHERE owner_id=? AND list_type='personal'",
            (uid,)
        ).fetchone()

    return row


def user_can_access_list(uid, list_id):
    db = get_db()

    row = db.execute("SELECT * FROM lists WHERE id=?", (list_id,)).fetchone()
    if not row:
        return None

    # Owner always allowed
    if row["owner_id"] == uid:
        return row

    # Personal: only owner allowed
    if row["list_type"] == "personal":
        return None

    # Collaborative: check membership JSON
    members = json.loads(row["members"])
    if uid in members:
        return row

    return None


def user_can_access_task(uid, task_id):
    db = get_db()

    row = db.execute("""
        SELECT t.*, l.owner_id, l.list_type, l.members
        FROM tasks t
        JOIN lists l ON t.list_id = l.id
        WHERE t.id = ?
    """, (task_id,)).fetchone()

    if not row:
        return None, None

    if row["owner_id"] == uid:
        return row, row

    if row["list_type"] == "personal":
        return None, None

    members = json.loads(row["members"])
    if uid in members:
        return row, row

    return None, None


## ---------------- AUTH ROUTES ---------------- ##

@app.post("/api/signup")
def signup():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()

    if not username or not password or not name:
        return jsonify({"error": "Please fill out all fields"}), 400

    db = get_db()
    existing = db.execute(
        "SELECT 1 FROM users WHERE username=?", (username,)
    ).fetchone()

    if existing:
        return jsonify({"error": "This username already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")

    cur = db.cursor()
    cur.execute(
        "INSERT INTO users (username, password, name) VALUES (?, ?, ?)",
        (username, hashed_pw, name)
    )
    user_id = cur.lastrowid

    # Create personal list for the new user
    db.execute(
        "INSERT INTO lists (name, owner_id, list_type, members) "
        "VALUES (?, ?, 'personal', '[]')",
        ("My Tasks", user_id)
    )

    db.commit()
    return jsonify({"status": "ok"}), 201


@app.post("/api/login")
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username or Password is missing"}), 400

    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE username=?", (username,)
    ).fetchone()

    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid username or password."}), 401

    session["user_id"] = user["id"]
    session["name"] = user["name"]
    session["username"] = user["username"]

    return jsonify({"user": dict(user)}), 200


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"status": "ok"}), 200


@app.get("/api/me")
def me():
    uid = current_user_id()
    if not uid:
        return jsonify({"user": None}), 200

    return jsonify({
        "user": {
            "id": uid,
            "username": session.get("username"),
            "name": session.get("name"),
        }
    }), 200


## ---------------- PROFILE + RECOVERY ---------------- ##

@app.put("/api/update_user/<int:user_id>")
def update_user(user_id):
    if not current_user_id():
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json or {}
    username = data.get("username")
    password = data.get("password")
    name = data.get("name")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if username and username != user["username"]:
        existing = db.execute(
            "SELECT 1 FROM users WHERE username=?", (username,)
        ).fetchone()
        if existing:
            return jsonify({"error": "Username already taken"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8") if password else None

    db.execute("""
        UPDATE users
        SET username = COALESCE(?, username),
            password = COALESCE(?, password),
            name = COALESCE(?, name)
        WHERE id = ?
    """, (username, hashed_pw, name, user_id))

    db.commit()

    updated = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    if user_id == current_user_id():
        session["name"] = updated["name"]
        session["username"] = updated["username"]

    return jsonify({"user": dict(updated)}), 200


@app.post("/api/recover")
def recover_password():
    data = request.json or {}
    username = data.get("username", "").strip()
    new_password = data.get("new_password", "").strip()

    if not username or not new_password:
        return jsonify({"error": "Please fill out all fields"}), 400

    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE username=?", (username,)
    ).fetchone()

    if not user:
        return jsonify({"error": "No account found"}), 404

    hashed_pw = bcrypt.generate_password_hash(new_password).decode("utf-8")

    db.execute(
        "UPDATE users SET password=? WHERE username=?",
        (hashed_pw, username)
    )
    db.commit()

    return jsonify({"status": "Password updated successfully"}), 200


## ---------------- LISTS (PERSONAL + COLLAB) ---------------- ##

@app.get("/api/lists")
def lists():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    db = get_db()
    personal = ensure_personal_list(uid)

    personal_json = {
        "id": personal["id"],
        "name": personal["name"],
        "type": personal["list_type"]
    }

    owned = db.execute(
        "SELECT id, name, list_type, members FROM lists "
        "WHERE owner_id=? AND list_type='collab'",
        (uid,)
    ).fetchall()

    owned_collab = [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["list_type"],
            "is_owner": True
        }
        for r in owned
    ]

    # member lists
    all_lists = db.execute(
        "SELECT * FROM lists WHERE list_type='collab'"
    ).fetchall()

    member_collab = []
    for l in all_lists:
        members = json.loads(l["members"])
        if uid in members and uid != l["owner_id"]:
            owner_name = db.execute(
                "SELECT name FROM users WHERE id=?", (l["owner_id"],)
            ).fetchone()["name"]

            member_collab.append({
                "id": l["id"],
                "name": l["name"],
                "type": l["list_type"],
                "owner_id": l["owner_id"],
                "owner_name": owner_name,
                "is_owner": False
            })

    return jsonify({
        "personal": personal_json,
        "collab_owned": owned_collab,
        "collab_member": member_collab
    }), 200


@app.post("/api/collab_lists")
def create_collab_list():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json or {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "List name required"}), 400

    db = get_db()
    cur = db.cursor()

    # FIXED INSERT — correct table + correct columns
    cur.execute(
        "INSERT INTO lists (name, owner_id, list_type, members) "
        "VALUES (?, ?, 'collab', '[]')",
        (name, uid)
    )

    list_id = cur.lastrowid
    db.commit()

    return jsonify({"id": list_id, "name": name, "type": "collab"}), 201


@app.post("/api/collab_lists/<int:list_id>/invite")
def invite_to_collab(list_id):
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    db = get_db()
    cl = db.execute(
        "SELECT * FROM lists WHERE id=?", (list_id,)
    ).fetchone()

    if not cl:
        return jsonify({"error": "List not found"}), 404

    if cl["owner_id"] != uid:
        return jsonify({"error": "Only the owner can invite"}), 403

    data = request.json or {}
    username = data.get("username", "").strip()

    user = db.execute(
        "SELECT * FROM users WHERE username=?", (username,)
    ).fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    members = json.loads(cl["members"])

    if user["id"] in members:
        return jsonify({"error": "Already a member"}), 400

    members.append(user["id"])

    db.execute(
        "UPDATE lists SET members=? WHERE id=?",
        (json.dumps(members), list_id)
    )
    db.commit()

    return jsonify({"status": "ok"}), 200


## ---------------- TASK ROUTES ---------------- ##

@app.get("/api/tasks")
def get_tasks():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    db = get_db()

    list_id = request.args.get("list_id", type=int)

    if list_id is None:
        personal = ensure_personal_list(uid)
        list_id = personal["id"]

    cl = user_can_access_list(uid, list_id)
    if not cl:
        return jsonify({"error": "List not found or no access"}), 404

    rows = db.execute(
        "SELECT * FROM tasks WHERE list_id=? ORDER BY id DESC",
        (list_id,)
    ).fetchall()

    return jsonify([dict(r) for r in rows]), 200


@app.post("/api/tasks")
def add_task():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json or {}
    title = data.get("title", "").strip()
    due_date = data.get("due_date")
    due_time = data.get("due_time")
    priority = data.get("priority", "Low")

    list_id = data.get("list_id")

    db = get_db()

    if list_id is None:
        personal = ensure_personal_list(uid)
        list_id = personal["id"]

    cl = user_can_access_list(uid, list_id)
    if not cl:
        return jsonify({"error": "List not found or no access"}), 404

    if not title:
        return jsonify({"error": "Invalid input"}), 400

    db.execute(
        "INSERT INTO tasks (list_id, title, due_date, due_time, priority, completed) "
        "VALUES (?, ?, ?, ?, ?, 0)",
        (list_id, title, due_date, due_time, priority)
    )
    db.commit()

    return jsonify({"status": "ok"}), 201


@app.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    uid = current_user_id()
    if not current_user_id():
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json or {}
    db = get_db()

    task, cl = user_can_access_task(uid, task_id)
    if not task:
        return jsonify({"error": "Task not found or no access"}), 404

    title = data.get("title", task["title"])
    due_date = data.get("due_date", task["due_date"])
    due_time = data.get("due_time", task["due_time"])
    priority = data.get("priority", task["priority"])
    completed = data.get("completed", task["completed"])

    db.execute("""
        UPDATE tasks
        SET title=?, due_date=?, due_time=?, priority=?, completed=?
        WHERE id=?
    """, (title, due_date, due_time, priority, completed, task_id))

    db.commit()

    return jsonify({"status": "ok"}), 200


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401

    db = get_db()
    task, cl = user_can_access_task(uid, task_id)

    if not task:
        return jsonify({"error": "Task not found or no access"}), 404

    db.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    db.commit()

    return jsonify({"deleted_id": task_id}), 200


## ---------------- PAGE ROUTES ---------------- ##

@app.route("/todo")
def todo():
    return send_from_directory("static", "index.html")


@app.route("/accounts")
def accounts():
    return send_from_directory("", "accounts.html")


@app.route("/")
def root():
    if current_user_id():
        return redirect("/todo")
    return redirect("/accounts")


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        debug=DEBUG_MODE
    )


#ONLY for Local deployment working: 
# app.run(host="0.0.0.0", port=8000, debug=True)




# LOCAL DEV ONLY
# if __name__ == "__main__":
#     app.run(
#         host="0.0.0.0",
#         port=int(os.environ.get("PORT", 8000)),
#         debug=DEBUG_MODE
#     )