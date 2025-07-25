const db = require('../utils/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, name }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const stmt = db.prepare(
      INSERT INTO users (email, password, name)
      VALUES (?, ?, ?)
    );
    const result = stmt.run(email, hashedPassword, name);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static async validatePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.email) {
      fields.push('email = ?');
      values.push(data.email);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(UPDATE users SET +fields.join(', ')+ WHERE id = ?);
    stmt.run(...values);
    return this.findById(id);
  }
}

module.exports = User;
