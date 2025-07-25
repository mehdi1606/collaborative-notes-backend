const express = require('express');
const { register, login, getCurrentUser, logout } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/me', auth, getCurrentUser);
router.post('/logout', auth, logout);

module.exports = router;

// backend/src/routes/notes.js
const express = require('express');
const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
  getSharedNotes,
  getPublicNote
} = require('../controllers/noteController');
const { validate, noteSchema, updateNoteSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public/:token', getPublicNote);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.post('/', validate(noteSchema), createNote);
router.get('/', getNotes);
router.get('/shared', getSharedNotes);
router.get('/search', searchNotes);
router.get('/:id', getNote);
router.put('/:id', validate(updateNoteSchema), updateNote);
router.delete('/:id', deleteNote);

module.exports = router;