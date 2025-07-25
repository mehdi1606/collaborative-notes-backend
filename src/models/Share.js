const db = require('../utils/database');

class Share {
  static create({ noteId, sharedWithUserId, sharedByUserId, permission = 'read' }) {
    const stmt = db.prepare(`
      INSERT INTO shares (note_id, shared_with_user_id, shared_by_user_id, permission)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(noteId, sharedWithUserId, sharedByUserId, permission);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT s.*, n.title as note_title, u1.name as shared_with_name, u2.name as shared_by_name
      FROM shares s
      JOIN notes n ON s.note_id = n.id
      JOIN users u1 ON s.shared_with_user_id = u1.id
      JOIN users u2 ON s.shared_by_user_id = u2.id
      WHERE s.id = ?
    `);
    return stmt.get(id);
  }

  static findByNoteId(noteId) {
    const stmt = db.prepare(`
      SELECT s.*, u.name as shared_with_name, u.email as shared_with_email
      FROM shares s
      JOIN users u ON s.shared_with_user_id = u.id
      WHERE s.note_id = ?
    `);
    return stmt.all(noteId);
  }

  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT s.*, n.title as note_title, u.name as shared_by_name
      FROM shares s
      JOIN notes n ON s.note_id = n.id
      JOIN users u ON s.shared_by_user_id = u.id
      WHERE s.shared_with_user_id = ?
      ORDER BY s.created_at DESC
    `);
    return stmt.all(userId);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM shares WHERE id = ?');
    return stmt.run(id);
  }

  static deleteByNoteAndUser(noteId, userId) {
    const stmt = db.prepare('DELETE FROM shares WHERE note_id = ? AND shared_with_user_id = ?');
    return stmt.run(noteId, userId);
  }
}

module.exports = Share;