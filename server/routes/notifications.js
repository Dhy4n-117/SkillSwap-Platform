const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET api/notifications
// @desc    Get all notifications for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('fromUser', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ msg: 'Notification not found' });
    if (notif.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    
    notif.read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
