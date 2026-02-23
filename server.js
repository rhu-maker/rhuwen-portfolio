require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const DATABASE_PATH = process.env.DATABASE_PATH || './portfolio.db';
const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Routes

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get GitHub projects
app.get('/api/projects', (req, res) => {
  const githubUsername = process.env.GITHUB_USERNAME || 'octocat';
  const githubToken = process.env.GITHUB_TOKEN;

  const options = {
    hostname: 'api.github.com',
    path: `/users/${githubUsername}/repos?sort=updated&direction=desc&per_page=6`,
    method: 'GET',
    headers: {
      'User-Agent': 'Portfolio-App',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  if (githubToken) {
    options.headers['Authorization'] = `token ${githubToken}`;
  }

  https.get(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const repos = JSON.parse(data).map(repo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count
        }));
        res.json(repos);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
      }
    });
  }).on('error', (error) => {
    res.status(500).json({ error: 'GitHub API error', details: error.message });
  });
});

// API: Submit contact form
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Save to database
  db.run(
    'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [name, email, subject, message],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to save contact' });
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.PORTFOLIO_EMAIL,
        subject: `New Contact: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
          return res.status(500).json({ error: 'Failed to send email' });
        }
        res.json({ success: true, message: 'Contact form submitted successfully' });
      });
    }
  );
});

// API: Get testimonials
app.get('/api/testimonials', (req, res) => {
  db.all(
    'SELECT * FROM testimonials WHERE approved = 1 ORDER BY created_at DESC LIMIT 10',
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch testimonials' });
      }
      res.json(rows || []);
    }
  );
});

// API: Submit testimonial
app.post('/api/testimonials', (req, res) => {
  const { name, company, message, rating } = req.body;

  if (!name || !message || !rating) {
    return res.status(400).json({ error: 'Name, message, and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  db.run(
    'INSERT INTO testimonials (name, company, message, rating, approved) VALUES (?, ?, ?, ?, 0)',
    [name, company || 'Not specified', message, rating],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to save testimonial' });
      }
      res.json({ success: true, message: 'Testimonial submitted successfully' });
    }
  );
});

// Admin API: Get all submissions (for moderation)
app.get('/api/admin/submissions', (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== process.env.ADMIN_KEY && process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  db.all(
    'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 50',
    (err, contacts) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      db.all(
        'SELECT * FROM testimonials ORDER BY created_at DESC LIMIT 50',
        (err, testimonials) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ contacts, testimonials });
        }
      );
    }
  );
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Portfolio app running on http://localhost:${PORT}`);
});

// Utility function
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}