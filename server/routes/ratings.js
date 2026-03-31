const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Rating = require('../models/Rating');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @route   POST api/ratings
// @desc    Rate a user
// @access  Private
router.post('/', auth, async (req, res) => {
  const { ratee, score, comment, skill } = req.body;

  if (req.user.id === ratee) {
    return res.status(400).json({ msg: 'Cannot rate yourself' });
  }

  try {
    const newRating = new Rating({
      rater: req.user.id,
      ratee,
      score,
      comment,
      skill
    });

    const rating = await newRating.save();

    // Update average rating for the user
    const ratings = await Rating.find({ ratee });
    const avgRating = ratings.reduce((acc, item) => item.score + acc, 0) / ratings.length;
    
    await User.findByIdAndUpdate(ratee, { 
      avgRating: avgRating.toFixed(1),
      numRatings: ratings.length
    });

    // Create notification for ratee
    const rater = await User.findById(req.user.id).select('name');
    const notif = new Notification({
      user: ratee,
      type: 'rating',
      message: `${rater.name} gave you a ${score}★ rating!`,
      fromUser: req.user.id
    });
    await notif.save();
    const io = req.app.get('io');
    if (io) io.to(ratee).emit('notification', { type: 'rating', message: notif.message });

    res.json(rating);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/ratings/:userId
// @desc    Get ratings for a user
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const ratings = await Rating.find({ ratee: req.params.userId }).populate('rater', ['name']);
    res.json(ratings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/ratings/skill/:skillId
// @desc    Get ratings linked to a specific skill
// @access  Public
router.get('/skill/:skillId', async (req, res) => {
  try {
    const ratings = await Rating.find({ skill: req.params.skillId }).populate('rater', ['name']);
    res.json(ratings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

