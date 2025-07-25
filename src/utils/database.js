const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(process.env.DATABASE_PATH || './database/notes.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(process.env.DATABASE_PATH || './database/notes.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'shared', 'public')),
      user_id INTEGER NOT NULL,
      public_token TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      shared_by_user_id INTEGER NOT NULL,
      permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(note_id, shared_with_user_id)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes (user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_status ON notes (status);
    CREATE INDEX IF NOT EXISTS idx_notes_public_token ON notes (public_token);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at);
    CREATE INDEX IF NOT EXISTS idx_shares_note_id ON shares (note_id);
    CREATE INDEX IF NOT EXISTS idx_shares_shared_with_user_id ON shares (shared_with_user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `);

  console.log('✅ Database tables created successfully');
};

// Create tables on initialization
createTables();

// Database utility functions
const dbUtils = {
  // Transaction wrapper
  transaction: (fn) => {
    return db.transaction(fn);
  },

  // Backup database
  backup: (filename) => {
    const backup = db.backup(filename);
    backup.exec();
    console.log(`Database backed up to ${filename}`);
  },

  // Get database info
  getInfo: () => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes').get();
    const shareCount = db.prepare('SELECT COUNT(*) as count FROM shares').get();
    
    return {
      users: userCount.count,
      notes: noteCount.count,
      shares: shareCount.count,
      dbPath: process.env.DATABASE_PATH || './database/notes.db'
    };
  },

  // Clean up old public tokens for private/shared notes
  cleanupTokens: () => {
    const stmt = db.prepare(`
      UPDATE notes 
      SET public_token = NULL 
      WHERE status != 'public' AND public_token IS NOT NULL
    `);
    const result = stmt.run();
    console.log(`Cleaned up ${result.changes} old public tokens`);
    return result.changes;
  },

  // Vacuum database (cleanup and optimize)
  vacuum: () => {
    db.exec('VACUUM');
    console.log('Database optimized');
  },

  // Close database connection
  close: () => {
    db.close();
    console.log('Database connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database connection...');
  db.close();
  process.exit(0);
});

module.exports = db;
module.exports.utils = dbUtils;