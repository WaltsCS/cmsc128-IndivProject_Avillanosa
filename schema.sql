PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Low' CHECK(priority IN ('High','Mid','Low')),
    due_date TEXT,
    due_time TEXT,
    created_at TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
);