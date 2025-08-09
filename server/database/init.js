const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'survey_tool.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
        }
      });

      // Surveys table
      db.run(`CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        questions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating surveys table:', err.message);
          reject(err);
        }
      });

      // Survey responses table
      db.run(`CREATE TABLE IF NOT EXISTS survey_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        survey_id INTEGER NOT NULL,
        responses TEXT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (survey_id) REFERENCES surveys (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating survey_responses table:', err.message);
          reject(err);
        }
      });

      // Create default admin user
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
        ['admin', defaultPassword], (err) => {
        if (err) {
          console.error('Error creating default user:', err.message);
        } else {
          console.log('Default admin user created (username: admin, password: admin123)');
        }
      });

      // Create sample survey
      const sampleQuestions = JSON.stringify([
        {
          id: 1,
          type: 'text',
          question: 'What is your name?',
          required: true
        },
        {
          id: 2,
          type: 'radio',
          question: 'How satisfied are you with our service?',
          options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
          required: true
        },
        {
          id: 3,
          type: 'textarea',
          question: 'Please provide any additional feedback:',
          required: false
        }
      ]);

      db.run(`INSERT OR IGNORE INTO surveys (id, title, description, questions) VALUES (?, ?, ?, ?)`,
        [1, 'Customer Satisfaction Survey', 'Help us improve our service by sharing your feedback', sampleQuestions],
        (err) => {
          if (err) {
            console.error('Error creating sample survey:', err.message);
          } else {
            console.log('Sample survey created');
          }
        });

      resolve();
    });
  });
}

module.exports = { db, initializeDatabase };