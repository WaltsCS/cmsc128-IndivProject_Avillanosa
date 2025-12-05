PRAGMA foreign_keys = ON;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
);

-- LISTS (Personal + Collaborative)
-- list_type = 'personal' or 'collab'
-- members = JSON array of user IDs, only used when list_type = 'collab'

CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    list_type TEXT NOT NULL DEFAULT 'personal',
    members TEXT NOT NULL DEFAULT '[]',   -- JSON text
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

-- TASKS (All tasks belong to a list)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'Low',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(list_id) REFERENCES lists(id) ON DELETE CASCADE
);
