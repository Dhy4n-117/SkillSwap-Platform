const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String },
  year: { type: String },
  points: { type: Number, default: 240 },
  skillsOffer: [{ type: String }],
  skillsWant: [{ type: String }],
  avgRating: { type: Number, default: 0 },
  numRatings: { type: Number, default: 0 },
  exchangesCompleted: { type: Number, default: 0 },
  acceptedExchanges: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
