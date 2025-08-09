const express = require('express');
const { requireAuth } = require('./auth');
const router = express.Router();

// Get dashboard data
router.get('/data', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username
    },
    surveys: [
      {
        id: 1,
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve our service by sharing your feedback'
      }
    ]
  });
});

module.exports = router;