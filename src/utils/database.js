const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
const initTables = () => {
  // Users table
  db.exec(
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  );

  // Notes table
  db.exec(
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      visibility TEXT CHECK(visibility IN ('private', 'shared', 'public')) DEFAULT 'private',
      public_token TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  );

  // Shares table
  db.exec(
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      shared_by_user_id INTEGER NOT NULL,
      permission TEXT CHECK(permission IN ('read', 'write')) DEFAULT 'read',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(note_id, shared_with_user_id)
    )
  );

  // Create indexes
  db.exec(
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
    CREATE INDEX IF NOT EXISTS idx_notes_public_token ON notes(public_token);
    CREATE INDEX IF NOT EXISTS idx_shares_note_id ON shares(note_id);
    CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with_user_id);
  );

  console.log('✅ Database tables initialized');
};

initTables();

module.exports = db;
