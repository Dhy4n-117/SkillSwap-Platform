const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rating', RatingSchema);
