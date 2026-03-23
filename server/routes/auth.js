const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, department, year, skillsOffer } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      department,
      year,
      skillsOffer: skillsOffer || []
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth
// @desc    Get logged in user
// @access  Private
const auth = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('savedMentors', 'name department year avgRating');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   POST /api/auth/mentors/:id
// @desc    Toggle saving/removing a user from mentors network
// @access  Private
router.post('/mentors/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const mentorId = req.params.id;

    if (user.savedMentors.includes(mentorId)) {
      // Remove
      user.savedMentors = user.savedMentors.filter(id => id.toString() !== mentorId);
      await user.save();
      return res.json({ msg: 'Removed from network', savedMentors: user.savedMentors });
    } else {
      // Add
      user.savedMentors.push(mentorId);
      await user.save();
      return res.json({ msg: 'Added to network', savedMentors: user.savedMentors });
    }
  } catch (err) {
    console.error(err.message);
    if(err.kind === 'ObjectId') return res.status(404).json({ msg: 'User not found' });
    res.status(500).send('Server error');
  }
});

module.exports = router;

