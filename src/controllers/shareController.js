const Share = require('../models/Share');
const Note = require('../models/Note');
const User = require('../models/User');

const shareNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email, permission } = req.body;

    // Check if note exists and user owns it
    const note = Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only share your own notes' });
    }

    // Find user to share with
    const userToShareWith = User.findByEmail(email);
    if (!userToShareWith) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    if (userToShareWith.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot share a note with yourself' });
    }

    // Check if already shared
    const existingShare = Share.findByNoteId(noteId).find(
      share => share.shared_with_user_id === userToShareWith.id
    );
    
    if (existingShare) {
      return res.status(400).json({ error: 'Note is already shared with this user' });
    }

    // Create share
    const share = Share.create({
      noteId: parseInt(noteId),
      sharedWithUserId: userToShareWith.id,
      sharedByUserId: req.user.id,
      permission
    });

    res.status(201).json({
      success: true,
      message: 'Note shared successfully',
      share
    });
  } catch (error) {
    console.error('Share note error:', error);
    res.status(500).json({ error: 'Failed to share note' });
  }
};

const getSharedUsers = async (req, res) => {
  try {
    const { noteId } = req.params;

    // Check if note exists and user owns it
    const note = Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shares = Share.findByNoteId(noteId);

    res.json({
      success: true,
      shares
    });
  } catch (error) {
    console.error('Get shared users error:', error);
    res.status(500).json({ error: 'Failed to fetch shared users' });
  }
};

const revokeShare = async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = Share.findById(shareId);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Check if user owns the note
    const note = Note.findById(share.note_id);
    if (note.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Share.delete(shareId);

    res.json({
      success: true,
      message: 'Share revoked successfully'
    });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
};

const getReceivedShares = async (req, res) => {
  try {
    const shares = Share.findByUserId(req.user.id);

    res.json({
      success: true,
      shares
    });
  } catch (error) {
    console.error('Get received shares error:', error);
    res.status(500).json({ error: 'Failed to fetch received shares' });
  }
};

module.exports = {
  shareNote,
  getSharedUsers,
  revokeShare,
  getReceivedShares
};