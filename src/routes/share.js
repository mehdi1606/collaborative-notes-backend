const express = require('express');
const {
  shareNote,
  getSharedUsers,
  revokeShare,
  getReceivedShares
} = require('../controllers/shareController');
const { validate, shareSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

router.post('/:noteId', validate(shareSchema), shareNote);
router.get('/note/:noteId', getSharedUsers);
router.delete('/:shareId', revokeShare);
router.get('/received', getReceivedShares);

module.exports = router;