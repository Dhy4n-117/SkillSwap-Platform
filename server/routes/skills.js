const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Skill = require('../models/Skill');
const User = require('../models/User');

// @route   GET api/skills/stats
// @desc    Get platform statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const activeStudents = await User.countDocuments();
    const skillsListed = await Skill.countDocuments();
    
    const users = await User.find();
    let exchangesDone = 0;
    let totalRating = 0;
    let usersWithRatings = 0;
    
    users.forEach(u => {
      exchangesDone += (u.exchangesCompleted || 0);
      if(u.avgRating > 0) {
        totalRating += u.avgRating;
        usersWithRatings++;
      }
    });
    
    // Each exchange modifies 2 users, so divide by 2
    exchangesDone = Math.floor(exchangesDone / 2);
    const avgRating = usersWithRatings > 0 ? (totalRating / usersWithRatings).toFixed(1) : "0.0";

    res.json({ activeStudents, skillsListed, exchangesDone, avgRating });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/skills
// @desc    Get all skills with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    const skills = await Skill.find(query).populate('provider', ['name', 'department', 'year', 'avgRating']);
    res.json(skills);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/skills
// @desc    Create a skill listing
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, category, description, exchangeMethod, points, deliveryTime, tags } = req.body;

  try {
    const newSkill = new Skill({
      title,
      category,
      description,
      exchangeMethod,
      points,
      deliveryTime,
      tags,
      provider: req.user.id
    });

    const skill = await newSkill.save();
    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id).populate('provider', 'name department year avgRating numRatings');
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/skills/:id
// @desc    Delete a skill listing
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    
    // Check user
    if (skill.provider.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    await skill.deleteOne();
    res.json({ msg: 'Skill removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Skill not found' });
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/skills/exchange/accept
// @desc    Accept a skill exchange
// @access  Private
router.post('/exchange/accept', auth, async (req, res) => {
  const { providerId, skillId, points } = req.body;
  try {
    const receiver = await User.findById(req.user.id);
    const provider = await User.findById(providerId);
    if (!receiver || !provider) return res.status(404).json({ msg: 'User not found' });
    if (req.user.id === providerId) return res.status(400).json({ msg: 'You cannot exchange with yourself' });

    const convId = [req.user.id, providerId].sort().join('_');
    if (receiver.acceptedExchanges.includes(convId)) {
      return res.status(400).json({ msg: 'Exchange already completed for this conversation' });
    }

    // Deduct points from receiver, add to provider
    if (receiver.points < points) return res.status(400).json({ msg: 'Insufficient points' });

    receiver.points -= points;
    provider.points += points;
    
    receiver.exchangesCompleted += 1;
    provider.exchangesCompleted += 1;
    
    receiver.acceptedExchanges.push(convId);
    provider.acceptedExchanges.push(convId);

    await receiver.save();
    await provider.save();

    res.json({ 
      msg: 'Exchange accepted!', 
      newPoints: receiver.points, 
      exchangesCompleted: receiver.exchangesCompleted,
      acceptedExchanges: receiver.acceptedExchanges 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
