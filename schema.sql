CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'Low',
    completed INTEGER NOT NULL DEFAULT 0
);

