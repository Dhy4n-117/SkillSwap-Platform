const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// @route   GET api/messages/conversations
// @desc    Get all conversations for the logged in user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find unique conversation IDs for the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ timestamp: -1 });

    const conversationsMap = new Map();

    for (const msg of messages) {
      const otherUser = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!conversationsMap.has(otherUser)) {
        conversationsMap.set(otherUser, msg);
      }
    }

    const conversations = [];
    for (const [otherUserId, lastMsg] of conversationsMap.entries()) {
      const otherUser = await User.findById(otherUserId).select('name');
      conversations.push({
        id: otherUserId,
        name: otherUser.name,
        last: lastMsg.text,
        time: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        room: lastMsg.conversationId,
        init: otherUser.name.split(' ').map(n => n[0]).join(''),
        ab: 'var(--sky-soft)', // Placeholder colors
        ac: 'var(--sky)'
      });
    }

    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/:otherUserId
// @desc    Get message history with a specific user
// @access  Private
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ timestamp: 1 });

    const formattedMessages = messages.map(m => ({
      from: m.sender.toString() === userId ? 'me' : 'them',
      text: m.text,
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: m.conversationId
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
