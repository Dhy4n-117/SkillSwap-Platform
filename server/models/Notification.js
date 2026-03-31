const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['exchange_request', 'escrow_release', 'rating', 'verification'],
    required: true 
  },
  message: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
