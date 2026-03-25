const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Design', 'Coding', 'Notes', 'Tutoring', 'Video Editing', 'Project Help'] 
  },
  description: { type: String, required: true },
  exchangeMethod: { 
    type: String, 
    required: true, 
    enum: ['Points', 'Barter', 'Payment'] 
  },
  points: { type: Number, default: 0 },
  deliveryTime: { type: String },
  tags: [{ type: String }],
  portfolioUrl: { type: String },
  isVerified: { type: Boolean, default: false },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Skill', SkillSchema);
