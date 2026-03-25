const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Skill = require('../models/Skill');
const User = require('../models/User');

// --- Predefined Questions ---
const QUESTIONS = {
  'Coding': [
    { q: 'What is the difference between "==" and "===" in JavaScript?', keywords: ['type', 'value', 'strict', 'coercion'] },
    { q: 'What is a "closure" in JavaScript?', keywords: ['function', 'scope', 'outer', 'lexical'] },
    { q: 'How does "asynchronous" execution work in Node.js (Event Loop)?', keywords: ['non-blocking', 'stack', 'queue', 'callback', 'promise'] }
  ],
  'Design': [
    { q: 'What is the "Rule of Thirds" in layout design?', keywords: ['grid', 'intersection', 'balance', 'focal'] },
    { q: 'Explain the difference between Serif and Sans Serif fonts.', keywords: ['feet', 'stroke', 'modern', 'traditional', 'decorative'] },
    { q: 'What is "Visual Hierarchy"?', keywords: ['order', 'importance', 'size', 'color', 'contrast'] }
  ],
  'Notes': [
    { q: 'What is the Cornell Method of note-taking?', keywords: ['cue', 'summary', 'record', 'review', 'system'] },
    { q: 'How do you summarize a 50-page research paper efficiently?', keywords: ['abstract', 'conclusion', 'keywords', 'skimming', 'main idea'] },
    { q: 'What are the benefits of Mind Mapping?', keywords: ['visual', 'connection', 'structure', 'brainstorm', 'memory'] }
  ],
  'Tutoring': [
    { q: 'How do you handle a student who is struggling with a basic concept?', keywords: ['patience', 'example', 'analogy', 'break down', 'scaffolding'] },
    { q: 'What is "Active Listening" in a tutoring session?', keywords: ['feedback', 'clarify', 'repeat', 'engagement', 'focus'] },
    { q: 'How do you measure a student\'s progress?', keywords: ['assessment', 'quiz', 're-explain', 'confidence', 'goal'] }
  ],
  'Video Editing': [
    { q: 'What is a "Jump Cut"?', keywords: ['abrupt', 'time', 'transition', 'sequence', 'edit'] },
    { q: 'Explain Color Grading vs. Color Correction.', keywords: ['artistic', 'balance', 'exposure', 'mood', 'tonality'] },
    { q: 'What does "B-Roll" mean?', keywords: ['supplemental', 'coverage', 'cutaway', 'footage', 'context'] }
  ],
  'Project Help': [
    { q: 'What is the "Agile" methodology?', keywords: ['iterative', 'sprint', 'flexibility', 'scrum', 'collaboration'] },
    { q: 'How do you define the "Scope" of a project?', keywords: ['boundary', 'deliverable', 'requirement', 'limit', 'goal'] },
    { q: 'What is a "Gantt Chart"?', keywords: ['timeline', 'schedule', 'task', 'dependency', 'visual'] }
  ]
};

// In-memory interview storage (for demo purposes)
const ACTIVE_INTERVIEWS = {};

// @route   POST api/ai/start
// @desc    Start an AI interview for a skill
router.post('/start', auth, async (req, res) => {
  const { skillId } = req.body;
  try {
    const skill = await Skill.findById(skillId);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.provider.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });

    const qSet = QUESTIONS[skill.category] || QUESTIONS['Coding'];
    ACTIVE_INTERVIEWS[req.user.id] = {
      skillId,
      category: skill.category,
      currentStep: 0,
      score: 0,
      questions: qSet
    };

    res.json({ 
      question: qSet[0].q,
      step: 1,
      total: qSet.length
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/ai/answer
// @desc    Submit an answer and get next question or result
router.post('/answer', auth, async (req, res) => {
  const { answer } = req.body;
  const interview = ACTIVE_INTERVIEWS[req.user.id];

  if (!interview) return res.status(400).json({ msg: 'No active interview session' });

  try {
    const currentQ = interview.questions[interview.currentStep];
    const userAns = (answer || '').toLowerCase();
    
    // Logic: If answer contains at least 2 relevant keywords, give a point
    const matches = currentQ.keywords.filter(k => userAns.includes(k.toLowerCase()));
    if (matches.length >= 2) {
      interview.score += 1;
    }

    interview.currentStep += 1;

    if (interview.currentStep < interview.questions.length) {
      res.json({
        nextQuestion: interview.questions[interview.currentStep].q,
        step: interview.currentStep + 1,
        total: interview.questions.length,
        done: false
      });
    } else {
      // Interview complete
      const passed = interview.score >= 2; // Pass if at least 2/3 correct
      if (passed) {
        await Skill.findByIdAndUpdate(interview.skillId, { isVerified: true });
        const user = await User.findById(req.user.id);
        if (!user.verifiedSkills.includes(interview.category)) {
          user.verifiedSkills.push(interview.category);
          await user.save();
        }
      }
      
      const skillId = interview.skillId;
      delete ACTIVE_INTERVIEWS[req.user.id];

      res.json({
        done: true,
        passed,
        score: interview.score,
        msg: passed ? 'Congratulations! You passed the AI Verification.' : 'You did not pass the verification this time. Try again later!',
        skillId
      });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
