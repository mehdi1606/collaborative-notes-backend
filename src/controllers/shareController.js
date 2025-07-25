const Share = require('../models/Share');
const Note = require('../models/Note');
const User = require('../models/User');

// Share a note with another user
const shareNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email, permission = 'read' } = req.body;
    const userId = req.user.id;

    // Validate permission
    const validPermissions = ['read', 'write'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({
        error: 'Invalid permission. Must be read or write'
      });
    }

    // Check if note exists and user owns it
    const note = Note.findById(noteId);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    if (note.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied. You can only share notes you own.'
      });
    }

    // Find user to share with
    const targetUser = User.findByEmail(email);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found with this email address'
      });
    }

    // Check if user is trying to share with themselves
    if (targetUser.id === userId) {
      return res.status(400).json({
        error: 'You cannot share a note with yourself'
      });
    }

    // Check if note is already shared with this user
    const existingShare = Share.findByNoteId(noteId).find(
      share => share.shared_with_user_id === targetUser.id
    );

    if (existingShare) {
      return res.status(400).json({
        error: 'Note is already shared with this user'
      });
    }

    // Create share
    const share = Share.create({
      noteId: parseInt(noteId),
      sharedWithUserId: targetUser.id,
      sharedByUserId: userId,
      permission
    });

    // Update note status to shared if it's currently private
    if (note.status === 'private') {
      Note.update(noteId, {
        title: note.title,
        content: note.content,
        tags: note.tags,
        status: 'shared'
      });
    }

    res.status(201).json({
      message: 'Note shared successfully',
      share: {
        id: share.id,
        noteId: share.note_id,
        sharedWith: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email
        },
        permission: share.permission,
        createdAt: share.created_at
      }
    });

    console.log(`Note ${noteId} shared with ${email} by user ${userId}`);
  } catch (error) {
    console.error('Share note error:', error);
    res.status(500).json({
      error: 'Failed to share note'
    });
  }
};

// Get users a note is shared with
const getSharedUsers = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    // Check if note exists and user owns it
    const note = Note.findById(noteId);
    if (!note) {
      return res.status(404).json({
        error: 'Note not found'
      });
    }

    if (note.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied. You can only view shares for notes you own.'
      });
    }

    // Get shared users
    const shares = Share.findByNoteId(noteId);

    const sharedUsers = shares.map(share => ({
      shareId: share.id,
      user: {
        id: share.shared_with_user_id,
        name: share.shared_with_name,
        email: share.shared_with_email
      },
      permission: share.permission,
      sharedAt: share.created_at
    }));

    res.json({
      noteId: parseInt(noteId),
      noteTitle: note.title,
      sharedUsers,
      totalShares: sharedUsers.length
    });
  } catch (error) {
    console.error('Get shared users error:', error);
    res.status(500).json({
      error: 'Failed to get shared users'
    });
  }
};

// Revoke share access
const revokeShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;

    // Find the share
    const share = Share.findById(shareId);
    if (!share) {
      return res.status(404).json({
        error: 'Share not found'
      });
    }

    // Check if user owns the note or is the one being shared with
    const note = Note.findById(share.note_id);
    const canRevoke = note.user_id === userId || share.shared_with_user_id === userId;

    if (!canRevoke) {
      return res.status(403).json({
        error: 'Access denied. You can only revoke shares for notes you own or shares made with you.'
      });
    }

    // Delete the share
    Share.delete(shareId);

    // Check if note still has any shares, if not and status is shared, change to private
    const remainingShares = Share.findByNoteId(share.note_id);
    if (remainingShares.length === 0 && note.status === 'shared') {
      Note.update(share.note_id, {
        title: note.title,
        content: note.content,
        tags: note.tags,
        status: 'private'
      });
    }

    res.json({
      message: 'Share revoked successfully'
    });

    console.log(`Share ${shareId} revoked by user ${userId}`);
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      error: 'Failed to revoke share'
    });
  }
};

// Get notes shared with the current user
const getReceivedShares = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const shares = Share.findByUserId(userId);

    // Get detailed information for each shared note
    const sharedNotes = shares.slice(parseInt(offset), parseInt(offset) + parseInt(limit)).map(share => {
      const note = Note.findById(share.note_id);
      return {
        shareId: share.id,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          status: note.status,
          createdAt: note.created_at,
          updatedAt: note.updated_at
        },
        sharedBy: {
          name: share.shared_by_name
        },
        permission: share.permission,
        sharedAt: share.created_at
      };
    });

    res.json({
      shares: sharedNotes,
      pagination: {
        total: shares.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < shares.length
      }
    });
  } catch (error) {
    console.error('Get received shares error:', error);
    res.status(500).json({
      error: 'Failed to get received shares'
    });
  }
};

// Update share permission
const updateSharePermission = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { permission } = req.body;
    const userId = req.user.id;

    // Validate permission
    const validPermissions = ['read', 'write'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({
        error: 'Invalid permission. Must be read or write'
      });
    }

    // Find the share
    const share = Share.findById(shareId);
    if (!share) {
      return res.status(404).json({
        error: 'Share not found'
      });
    }

    // Check if user owns the note
    const note = Note.findById(share.note_id);
    if (note.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied. You can only update permissions for notes you own.'
      });
    }

    // Update permission (we need to delete and recreate since there's no update method)
    Share.delete(shareId);
    const updatedShare = Share.create({
      noteId: share.note_id,
      sharedWithUserId: share.shared_with_user_id,
      sharedByUserId: userId,
      permission
    });

    res.json({
      message: 'Share permission updated successfully',
      share: {
        id: updatedShare.id,
        permission: updatedShare.permission
      }
    });

    console.log(`Share permission updated: ${shareId} to ${permission} by user ${userId}`);
  } catch (error) {
    console.error('Update share permission error:', error);
    res.status(500).json({
      error: 'Failed to update share permission'
    });
  }
};

// Search users for sharing
const searchUsers = async (req, res) => {
  try {
    const { q: query } = req.query;
    const userId = req.user.id;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Search users but exclude current user
    const users = User.searchByNameOrEmail(query)
      .filter(user => user.id !== userId)
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email
      }));

    res.json({
      users,
      query
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Failed to search users'
    });
  }
};

// Get sharing statistics
const getSharingStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Count notes shared by user
    const notesSharedByUser = Share.findByNoteId().filter(share => share.shared_by_user_id === userId).length;
    
    // Count notes shared with user
    const notesSharedWithUser = Share.findByUserId(userId).length;

    // Count unique users who have shared with this user
    const uniqueSharers = new Set(Share.findByUserId(userId).map(share => share.shared_by_user_id)).size;

    // Count unique users this user has shared with
    const uniqueRecipients = new Set(
      Share.findByNoteId().filter(share => share.shared_by_user_id === userId)
        .map(share => share.shared_with_user_id)
    ).size;

    res.json({
      stats: {
        notesSharedByMe: notesSharedByUser,
        notesSharedWithMe: notesSharedWithUser,
        uniqueSharers,
        uniqueRecipients
      }
    });
  } catch (error) {
    console.error('Get sharing stats error:', error);
    res.status(500).json({
      error: 'Failed to get sharing statistics'
    });
  }
};

module.exports = {
  shareNote,
  getSharedUsers,
  revokeShare,
  getReceivedShares,
  updateSharePermission,
  searchUsers,
  getSharingStats
};