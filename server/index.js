const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'leaderboard.db');

// Ensure data directory exists
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            avatarId TEXT,
            avatarColor TEXT,
            score INTEGER,
            updatedAt INTEGER
        )`);
    }
});

// API Routes

// Auth: Register
app.post('/api/auth/register', (req, res) => {
    const { id, username, password, avatarId, avatarColor } = req.body;

    // Validation
    if (!username || username.length < 2) {
        return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const now = Date.now();
    const query = `INSERT INTO users (id, username, password, avatarId, avatarColor, score, updatedAt) VALUES (?, ?, ?, ?, ?, 0, ?)`;
    
    db.run(query, [id, username, password, avatarId, avatarColor, now], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, user: { id, username, avatarId, avatarColor } });
    });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT id, username, avatarId, avatarColor, score FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        res.json({ success: true, user: row });
    });
});

// Sync Score (Upsert)
app.post('/api/sync', (req, res) => {
    const { id, username, avatarId, avatarColor, score } = req.body;
    
    if (!id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = Date.now();

    // Upsert logic
    const query = `
        INSERT INTO users (id, username, avatarId, avatarColor, score, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            avatarId = excluded.avatarId,
            avatarColor = excluded.avatarColor,
            score = max(score, excluded.score),
            updatedAt = excluded.updatedAt
    `;

    db.run(query, [id, username, avatarId, avatarColor, score, now], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
    db.all(`SELECT id, username, avatarId, avatarColor, score FROM users ORDER BY score DESC LIMIT 50`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
