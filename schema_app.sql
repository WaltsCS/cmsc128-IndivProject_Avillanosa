PRAGMA foreign_keys = ON;

--USERS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
);

--LISTS (personal + collab)
--list_type: 'personal' or 'collab'
CREATE TABLE IF NOT EXISTS collab_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    list_type TEXT NOT NULL DEFAULT 'personal',
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

--MEMBERSHIP for collab lists
CREATE TABLE IF NOT EXISTS collab_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY(list_id) REFERENCES collab_lists(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

--TASKS belong to a list (personal or collab)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'Low',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(list_id) REFERENCES collab_lists(id) ON DELETE CASCADE
);
