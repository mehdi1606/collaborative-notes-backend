const db = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

class Note {
  static create({ title, content, tags, status, userId }) {
    const publicToken = status === 'public' ? uuidv4() : null;
    const stmt = db.prepare(`
      INSERT INTO notes (title, content, tags, status, user_id, public_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = stmt.run(title, content, tags, status, userId, publicToken);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT n.*, u.name as author_name, u.email as author_email
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `);
    return stmt.get(id);
  }

  static findByUserId(userId, { status, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT n.*, u.name as author_name 
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND n.status = ?';
      params.push(status);
    }

    query += ' ORDER BY n.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static findByPublicToken(token) {
    const stmt = db.prepare(`
      SELECT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.public_token = ? AND n.status = 'public'
    `);
    return stmt.get(token);
  }

  static findSharedWithUser(userId, { limit = 50, offset = 0 } = {}) {
    const stmt = db.prepare(`
      SELECT n.*, u.name as author_name, s.permission, s.created_at as shared_at
      FROM notes n
      JOIN users u ON n.user_id = u.id
      JOIN shares s ON n.id = s.note_id
      WHERE s.shared_with_user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  }

  static update(id, { title, content, tags, status }) {
    let publicToken = null;
    
    // If changing to public, generate a token
    if (status === 'public') {
      const currentNote = this.findById(id);
      publicToken = currentNote.public_token || uuidv4();
    }

    const stmt = db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, tags = ?, status = ?, public_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(title, content, tags, status, publicToken, id);
    return this.findById(id);
  }

  static delete(id) {
    // Delete related shares first
    const deleteShares = db.prepare('DELETE FROM shares WHERE note_id = ?');
    deleteShares.run(id);
    
    // Delete the note
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    return stmt.run(id);
  }

  static search(userId, { query, tags, status, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT DISTINCT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN shares s ON n.id = s.note_id
      WHERE (n.user_id = ? OR s.shared_with_user_id = ?)
    `;
    const params = [userId, userId];

    if (query) {
      sql += ' AND (n.title LIKE ? OR n.content LIKE ? OR n.tags LIKE ?)';
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      const tagConditions = tagArray.map(() => 'n.tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      tagArray.forEach(tag => params.push(`%${tag}%`));
    }

    if (status) {
      sql += ' AND n.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY n.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  static getStats(userId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'private' THEN 1 ELSE 0 END) as private_count,
        SUM(CASE WHEN status = 'shared' THEN 1 ELSE 0 END) as shared_count,
        SUM(CASE WHEN status = 'public' THEN 1 ELSE 0 END) as public_count
      FROM notes 
      WHERE user_id = ?
    `);
    return stmt.get(userId);
  }

  static getRecentlyUpdated(userId, limit = 5) {
    const stmt = db.prepare(`
      SELECT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN shares s ON n.id = s.note_id
      WHERE (n.user_id = ? OR s.shared_with_user_id = ?)
      ORDER BY n.updated_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, userId, limit);
  }

  static getUserNoteAccess(noteId, userId) {
    // Check if user owns the note
    const ownNote = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?');
    if (ownNote.get(noteId, userId)) {
      return { access: true, permission: 'owner' };
    }

    // Check if note is shared with user
    const sharedNote = db.prepare(`
      SELECT permission FROM shares 
      WHERE note_id = ? AND shared_with_user_id = ?
    `);
    const share = sharedNote.get(noteId, userId);
    if (share) {
      return { access: true, permission: share.permission };
    }

    return { access: false, permission: null };
  }

  static countByUser(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?');
    const result = stmt.get(userId);
    return result.count;
  }
}

module.exports = Note;