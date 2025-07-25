const Note = require('../models/Note');

const createNote = async (req, res) => {
  try {
    const { title, content, tags, visibility } = req.body;
    
    const note = Note.create({
      title,
      content,
      tags,
      visibility,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

const getNotes = async (req, res) => {
  try {
    const { search, tags, visibility, page = 1, limit = 10 } = req.query;
    
    const notes = Note.findByUserId(req.user.id, {
      search,
      tags,
      visibility,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notes.length
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this note
    const access = Note.canUserAccess(id, req.user.id);
    if (!access.canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      note,
      permission: access.permission
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, visibility } = req.body;

    // Check if user can edit this note
    const access = Note.canUserAccess(id, req.user.id);
    if (!access.canAccess || access.permission !== 'write') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const note = Note.update(id, { title, content, tags, visibility });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      message: 'Note updated successfully',
      note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns this note
    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Note.delete(id);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

const searchNotes = async (req, res) => {
  try {
    const { q, tags, visibility, page = 1, limit = 10 } = req.query;
    
    const notes = Note.findByUserId(req.user.id, {
      search: q,
      tags,
      visibility,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      notes,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notes.length
      }
    });
  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({ error: 'Failed to search notes' });
  }
};

const getSharedNotes = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    const notes = Note.findSharedWithUser(req.user.id, {
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notes.length
      }
    });
  } catch (error) {
    console.error('Get shared notes error:', error);
    res.status(500).json({ error: 'Failed to fetch shared notes' });
  }
};

const getPublicNote = async (req, res) => {
  try {
    const { token } = req.params;
    
    const note = Note.findByPublicToken(token);
    if (!note) {
      return res.status(404).json({ error: 'Public note not found' });
    }

    res.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Get public note error:', error);
    res.status(500).json({ error: 'Failed to fetch public note' });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
  getSharedNotes,
  getPublicNote
};
