PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('High', 'Mid', 'Low')) NOT NULL DEFAULT 'Low',
    due_date TEXT,
    due_time TEXT,
    created_at TEXT, NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
);