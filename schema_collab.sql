PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collab_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS collab_members (
    list_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY(list_id, user_id),
    FOREIGN KEY(list_id) REFERENCES collab_lists(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS collab_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'Low',
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(list_id) REFERENCES collab_lists(id)
);
