const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini if key exists
let genAI, model;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// --- Predefined Questions (Fallback) ---
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

const ACTIVE_INTERVIEWS = {};

// @route   POST api/ai/start
router.post('/start', auth, async (req, res) => {
  const { skillId } = req.body;
  try {
    const skill = await Skill.findById(skillId);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.provider.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });

    let finalQuestions = [];
    let isLLM = false;

    if (model) {
      try {
        const prompt = `Act as a technical examiner for SkillSwap. 
        Generate 3 specific, medium-difficulty technical questions to test a student's proficiency in "${skill.title}" (Category: ${skill.category}).
        Return them as a JSON array of strings ONLY. No markdown formatting, no object keys.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();
        finalQuestions = JSON.parse(text).map(q => ({ q, isLLM: true }));
        isLLM = true;
      } catch (e) {
        console.error("Gemini Question Gen Failed, falling back", e);
      }
    }

    if (finalQuestions.length === 0) {
      const qSet = QUESTIONS[skill.category] || QUESTIONS['Coding'];
      finalQuestions = qSet.map(item => ({ ...item, isLLM: false }));
    }

    ACTIVE_INTERVIEWS[req.user.id] = {
      skillId,
      skillTitle: skill.title,
      category: skill.category,
      currentStep: 0,
      answers: [],
      questions: finalQuestions,
      isLLM
    };

    res.json({ 
      question: finalQuestions[0].q,
      step: 1,
      total: finalQuestions.length,
      isLLM
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/ai/answer
router.post('/answer', auth, async (req, res) => {
  const { answer } = req.body;
  const interview = ACTIVE_INTERVIEWS[req.user.id];

  if (!interview) return res.status(400).json({ msg: 'No active interview session' });

  try {
    interview.answers.push(answer);
    interview.currentStep += 1;

    if (interview.currentStep < interview.questions.length) {
      res.json({
        nextQuestion: interview.questions[interview.currentStep].q,
        step: interview.currentStep + 1,
        total: interview.questions.length,
        done: false
      });
    } else {
      // Evaluation Phase
      let passed = false;
      let feedback = "";

      if (interview.isLLM && model) {
        try {
          const qAs = interview.questions.map((q, i) => `Q: ${q.q}\nA: ${interview.answers[i]}`).join("\n\n");
          const evalPrompt = `Evaluate this technical interview for the skill "${interview.skillTitle}".
          Criteria: User must demonstrate genuine technical understanding. If they use "idk" or short irrelevant answers, they fail.
          Questions and Answers:
          ${qAs}
          
          Return a JSON object: { "passed": boolean, "msg": "Brief constructive feedback for the student" }`;
          
          const result = await model.generateContent(evalPrompt);
          const response = await result.response;
          const text = response.text().replace(/```json|```/g, "").trim();
          const evalRes = JSON.parse(text);
          passed = evalRes.passed;
          feedback = evalRes.msg;
        } catch (e) {
          console.error("Gemini Evaluation Failed", e);
          // Simple fallback if LLM fail during eval
          passed = interview.answers.every(a => a.length > 20);
          feedback = "Manual check passed based on length.";
        }
      } else {
        // Fallback Keyword Logic
        let score = 0;
        interview.questions.forEach((q, i) => {
          if (q.keywords) {
            const matches = q.keywords.filter(k => interview.answers[i].toLowerCase().includes(k.toLowerCase()));
            if (matches.length >= 2) score++;
          } else {
            if (interview.answers[i].length > 20) score++;
          }
        });
        passed = score >= 2;
        feedback = passed ? 'Congratulations! You passed the AI Verification.' : 'You did not pass the verification. Please provide more technical detail!';
      }

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
        msg: feedback,
        skillId
      });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
