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
  const { title, category, description, exchangeMethod, points, deliveryTime, tags, portfolioUrl } = req.body;

  try {
    const newSkill = new Skill({
      title,
      category,
      description,
      exchangeMethod,
      points,
      deliveryTime,
      tags,
      portfolioUrl,
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

// @route   POST api/skills/exchange/request
// @desc    Request an exchange, lock points in Escrow
// @access  Private
router.post('/exchange/request', auth, async (req, res) => {
  const { providerId, points } = req.body;
  try {
    const receiver = await User.findById(req.user.id);
    const convId = [req.user.id, providerId].sort().join('_');
    
    if (receiver.acceptedExchanges.includes(convId) || receiver.pendingExchanges.includes(convId)) {
      return res.status(400).json({ msg: 'Exchange already active or completed' });
    }
    if (req.user.id === providerId) return res.status(400).json({ msg: 'You cannot exchange with yourself' });
    if (receiver.points < points) return res.status(400).json({ msg: 'Insufficient points' });

    receiver.points -= points;
    receiver.pendingPoints += points;
    receiver.pendingExchanges.push(convId);
    await receiver.save();

    res.json({ msg: 'Points placed in Escrow', newPoints: receiver.points });
  } catch (err) { res.status(500).send('Server Error'); }
});

// @route   POST api/skills/exchange/accept
// @desc    Release Escrow points to Provider
// @access  Private
router.post('/exchange/accept', auth, async (req, res) => {
  const { providerId, points } = req.body;
  try {
    const receiver = await User.findById(req.user.id);
    const provider = await User.findById(providerId);
    if (!receiver || !provider) return res.status(404).json({ msg: 'User not found' });

    const convId = [req.user.id, providerId].sort().join('_');

    if (receiver.acceptedExchanges.includes(convId)) return res.status(400).json({ msg: 'Exchange already completed' });
    if (!receiver.pendingExchanges.includes(convId)) return res.status(400).json({ msg: 'No Escrow found. Please request exchange first.' });

    // Release points
    receiver.pendingPoints -= points;
    provider.points += points;
    
    receiver.exchangesCompleted += 1;
    provider.exchangesCompleted += 1;
    
    receiver.pendingExchanges = receiver.pendingExchanges.filter(id => id !== convId);
    receiver.acceptedExchanges.push(convId);
    provider.acceptedExchanges.push(convId);

    await receiver.save();
    await provider.save();

    res.json({ 
      msg: 'Escrow released! Exchange accepted.', 
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
