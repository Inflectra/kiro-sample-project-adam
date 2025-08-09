const express = require('express');
const { requireAuth } = require('./auth');
const { db } = require('../database/init');
const router = express.Router();

// Get survey data
router.get('/:id', requireAuth, (req, res) => {
  const surveyId = req.params.id;

  db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, survey) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: JSON.parse(survey.questions)
      }
    });
  });
});

// Submit survey response
router.post('/:id/submit', requireAuth, (req, res) => {
  const surveyId = req.params.id;
  const { responses } = req.body;
  const userId = req.session.userId;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!responses) {
    return res.status(400).json({ error: 'Survey responses are required' });
  }

  // Validate that survey exists
  db.get('SELECT id FROM surveys WHERE id = ?', [surveyId], (err, survey) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Save survey response
    db.run(
      'INSERT INTO survey_responses (user_id, survey_id, responses, ip_address) VALUES (?, ?, ?, ?)',
      [userId, surveyId, JSON.stringify(responses), ipAddress],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save survey response' });
        }

        res.json({
          success: true,
          responseId: this.lastID,
          message: 'Survey response saved successfully'
        });
      }
    );
  });
});

// Get user's survey responses
router.get('/responses/my', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    `SELECT sr.*, s.title as survey_title 
     FROM survey_responses sr 
     JOIN surveys s ON sr.survey_id = s.id 
     WHERE sr.user_id = ? 
     ORDER BY sr.completed_at DESC`,
    [userId],
    (err, responses) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({
        success: true,
        responses: responses.map(response => ({
          id: response.id,
          surveyTitle: response.survey_title,
          completedAt: response.completed_at,
          responses: JSON.parse(response.responses)
        }))
      });
    }
  );
});

module.exports = router;