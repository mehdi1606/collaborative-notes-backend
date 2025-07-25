const db = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

class Note {
  static create({ title, content, tags, visibility = 'private', userId }) {
    const publicToken = visibility === 'public' ? uuidv4() : null;
    const tagsString = Array.isArray(tags) ? tags.join(',') : tags || '';
    
    const stmt = db.prepare(
      INSERT INTO notes (title, content, tags, visibility, public_token, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    );
    const result = stmt.run(title, content, tagsString, visibility, publicToken, userId);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(
      SELECT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    );
    const note = stmt.get(id);
    if (note && note.tags) {
      note.tags = note.tags.split(',').filter(tag => tag.trim() !== '');
    }
    return note;
  }

  static findByUserId(userId, { search, tags, visibility, page = 1, limit = 10 } = {}) {
    let query = 
      SELECT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.user_id = ?
    ;
    const params = [userId];

    if (search) {
      query +=  AND (n.title LIKE ? OR n.content LIKE ? OR n.tags LIKE ?);
      const searchTerm = %+search+%;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (tags) {
      query +=  AND n.tags LIKE ?;
      params.push(%+tags+%);
    }

    if (visibility) {
      query +=  AND n.visibility = ?;
      params.push(visibility);
    }

    query +=  ORDER BY n.updated_at DESC LIMIT ? OFFSET ?;
    params.push(limit, (page - 1) * limit);

    const stmt = db.prepare(query);
    const notes = stmt.all(...params);
    
    return notes.map(note => ({
      ...note,
      tags: note.tags ? note.tags.split(',').filter(tag => tag.trim() !== '') : []
    }));
  }

  static findSharedWithUser(userId, { search, page = 1, limit = 10 } = {}) {
    let query = 
      SELECT n.*, u.name as author_name, s.permission, s.created_at as shared_at
      FROM notes n
      JOIN users u ON n.user_id = u.id
      JOIN shares s ON n.id = s.note_id
      WHERE s.shared_with_user_id = ?
    ;
    const params = [userId];

    if (search) {
      query +=  AND (n.title LIKE ? OR n.content LIKE ? OR n.tags LIKE ?);
      const searchTerm = %+search+%;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query +=  ORDER BY s.created_at DESC LIMIT ? OFFSET ?;
    params.push(limit, (page - 1) * limit);

    const stmt = db.prepare(query);
    const notes = stmt.all(...params);
    
    return notes.map(note => ({
      ...note,
      tags: note.tags ? note.tags.split(',').filter(tag => tag.trim() !== '') : []
    }));
  }

  static findByPublicToken(token) {
    const stmt = db.prepare(
      SELECT n.*, u.name as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.public_token = ? AND n.visibility = 'public'
    );
    const note = stmt.get(token);
    if (note && note.tags) {
      note.tags = note.tags.split(',').filter(tag => tag.trim() !== '');
    }
    return note;
  }

  static update(id, { title, content, tags, visibility }) {
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
    }
    if (tags !== undefined) {
      fields.push('tags = ?');
      values.push(Array.isArray(tags) ? tags.join(',') : tags || '');
    }
    if (visibility !== undefined) {
      fields.push('visibility = ?');
      values.push(visibility);
      
      if (visibility === 'public') {
        fields.push('public_token = ?');
        values.push(uuidv4());
      } else {
        fields.push('public_token = ?');
        values.push(null);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(UPDATE notes SET +fields.join(', ')+ WHERE id = ?);
    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    return stmt.run(id);
  }

  static canUserAccess(noteId, userId) {
    // Check if user owns the note
    const ownedNote = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
    if (ownedNote) return { canAccess: true, permission: 'write' };

    // Check if note is shared with user
    const sharedNote = db.prepare(
      SELECT s.permission FROM shares s
      WHERE s.note_id = ? AND s.shared_with_user_id = ?
    ).get(noteId, userId);
    if (sharedNote) return { canAccess: true, permission: sharedNote.permission };

    return { canAccess: false };
  }
}

module.exports = Note;
