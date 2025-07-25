const db = require('../utils/database');
const bcrypt = require('bcryptjs');

class User {
  static create({ name, email, password }) {
    const hashedPassword = bcrypt.hashSync(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = stmt.run(name, email, hashedPassword);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findByEmailForAuth(email) {
    const stmt = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findAll() {
    const stmt = db.prepare('SELECT id, name, email, created_at, updated_at FROM users ORDER BY name');
    return stmt.all();
  }

  static update(id, { name, email }) {
    const stmt = db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(name, email, id);
    return this.findById(id);
  }

  static updatePassword(id, newPassword) {
    const hashedPassword = bcrypt.hashSync(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const stmt = db.prepare(`
      UPDATE users 
      SET password = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(hashedPassword, id);
    return true;
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static validatePassword(inputPassword, hashedPassword) {
    return bcrypt.compareSync(inputPassword, hashedPassword);
  }

  static searchByNameOrEmail(query) {
    const stmt = db.prepare(`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY name
      LIMIT 10
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm);
  }

  static exists(email) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = stmt.get(email);
    return result.count > 0;
  }
}

module.exports = User;