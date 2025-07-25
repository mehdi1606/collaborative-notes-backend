const Note = require('../models/Note');
const Share = require('../models/Share');
const User = require('../models/User');

// Create a new note
const createNote = async (req, res) => {
  try {
    const { title, content, tags, status = 'private' } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['private', 'shared', 'public'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be private, shared, or public'
      });
    }

    // Create note
    const note = Note.create({
      title,
      content: content || '',
      tags: tags || '',
      status,
      userId
    });

    res.status(201).json({
      message: 'Note created successfully',
      note
    });

    console.log(`Note created: ${note.id} by user ${userId}`);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Failed to create note'
    });
  }
};

// Get all notes for the current user
const getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0, sort = 'updated_at', order = 'DESC' } = req.query;

    // Validate parameters
    const validSorts = ['title', 'created_at', 'updated_at'];
    const validOrders = ['ASC', 'DESC'];
    
    if (!validSorts.includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort parameter' });
    }
    
    if (!validOrders.includes(order.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid order parameter' });
    }

    const notes = Note.findByUserId(userId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get total count for pagination
    const totalCount = Note.countByUser(userId);

    res.json({
      notes,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Failed to get notes'
    });
  }
};

// Get a specific note by ID
const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    // Check access permissions
    const access = Note.getUserNoteAccess(id, userId);
    if (!access.access) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Add access info to response
    const noteWithAccess = {
      ...note,
      userPermission: access.permission
    };

    res.json({
      note: noteWithAccess
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      error: 'Failed to get note'
    });
  }
};

// Update a note
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, status } = req.body;
    const userId = req.user.id;

    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    // Check if user owns the note or has write permission
    const access = Note.getUserNoteAccess(id, userId);
    if (!access.access || (access.permission !== 'owner' && access.permission !== 'write')) {
      return res.status(403).json({
        error: 'Access denied. You can only edit notes you own or have write access to.'
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['private', 'shared', 'public'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be private, shared, or public'
        });
      }
    }

    // Update note
    const updatedNote = Note.update(id, {
      title: title || note.title,
      content: content !== undefined ? content : note.content,
      tags: tags !== undefined ? tags : note.tags,
      status: status || note.status
    });

    res.json({
      message: 'Note updated successfully',
      note: updatedNote
    });

    console.log(`Note updated: ${id} by user ${userId}`);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Failed to update note'
    });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    // Only the owner can delete the note
    if (note.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied. You can only delete notes you own.'
      });
    }

    // Delete note (this will also delete related shares due to CASCADE)
    Note.delete(id);

    res.json({
      message: 'Note deleted successfully'
    });

    console.log(`Note deleted: ${id} by user ${userId}`);
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Failed to delete note'
    });
  }
};

// Search notes
const searchNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      q: query, 
      tags, 
      status, 
      limit = 50, 
      offset = 0 
    } = req.query;

    if (!query && !tags && !status) {
      return res.status(400).json({
        error: 'At least one search parameter (q, tags, or status) is required'
      });
    }

    // Parse tags if provided
    let parsedTags = null;
    if (tags) {
      parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    const notes = Note.search(userId, {
      query,
      tags: parsedTags,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      notes,
      searchParams: {
        query,
        tags: parsedTags,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({
      error: 'Failed to search notes'
    });
  }
};

// Get notes shared with the current user
const getSharedNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const sharedNotes = Note.findSharedWithUser(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      notes: sharedNotes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get shared notes error:', error);
    res.status(500).json({
      error: 'Failed to get shared notes'
    });
  }
};

// Get a public note by token (no authentication required)
const getPublicNote = async (req, res) => {
  try {
    const { token } = req.params;

    const note = Note.findByPublicToken(token);
    if (!note) {
      return res.status(404).json({
        error: 'Public note not found or no longer available'
      });
    }

    // Remove sensitive information
    const publicNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      author_name: note.author_name,
      created_at: note.created_at,
      updated_at: note.updated_at
    };

    res.json({
      note: publicNote
    });
  } catch (error) {
    console.error('Get public note error:', error);
    res.status(500).json({
      error: 'Failed to get public note'
    });
  }
};

// Get note statistics
const getNoteStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = Note.getStats(userId);

    res.json({
      stats: {
        total: stats.total,
        private: stats.private_count,
        shared: stats.shared_count,
        public: stats.public_count
      }
    });
  } catch (error) {
    console.error('Get note stats error:', error);
    res.status(500).json({
      error: 'Failed to get note statistics'
    });
  }
};

// Duplicate a note
const duplicateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const originalNote = Note.findById(id);
    if (!originalNote) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    // Check access permissions
    const access = Note.getUserNoteAccess(id, userId);
    if (!access.access) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Create duplicate note (always private for the current user)
    const duplicatedNote = Note.create({
      title: `Copy of ${originalNote.title}`,
      content: originalNote.content,
      tags: originalNote.tags,
      status: 'private',
      userId
    });

    res.status(201).json({
      message: 'Note duplicated successfully',
      note: duplicatedNote
    });

    console.log(`Note duplicated: ${id} -> ${duplicatedNote.id} by user ${userId}`);
  } catch (error) {
    console.error('Duplicate note error:', error);
    res.status(500).json({
      error: 'Failed to duplicate note'
    });
  }
};

// Export note content
const exportNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const userId = req.user.id;

    const note = Note.findById(id);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    // Check access permissions
    const access = Note.getUserNoteAccess(id, userId);
    if (!access.access) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const exportData = {
      title: note.title,
      content: note.content,
      tags: note.tags,
      created_at: note.created_at,
      updated_at: note.updated_at,
      author: note.author_name
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${note.title.replace(/[^a-z0-9]/gi, '_')}.json"`);
      res.json(exportData);
    } else if (format === 'markdown') {
      const markdown = `# ${exportData.title}\n\n${exportData.content}\n\n---\n\n**Tags:** ${exportData.tags}\n**Created:** ${exportData.created_at}\n**Updated:** ${exportData.updated_at}\n**Author:** ${exportData.author}`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${note.title.replace(/[^a-z0-9]/gi, '_')}.md"`);
      res.send(markdown);
    } else {
      return res.status(400).json({
        error: 'Invalid format. Supported formats: json, markdown'
      });
    }
  } catch (error) {
    console.error('Export note error:', error);
    res.status(500).json({
      error: 'Failed to export note'
    });
  }
};

// Get recently updated notes
const getRecentNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recentNotes = Note.getRecentlyUpdated(userId, parseInt(limit));

    res.json({
      notes: recentNotes
    });
  } catch (error) {
    console.error('Get recent notes error:', error);
    res.status(500).json({
      error: 'Failed to get recent notes'
    });
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
  getPublicNote,
  getNoteStats,
  duplicateNote,
  exportNote,
  getRecentNotes
};