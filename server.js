console.log('SERVING FROM:', __dirname);
console.log('RUNNING FILE:', __filename);
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- MySQL connection pool ----
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', // <-- put your MySQL root password
  database: 'job_portal',
});

// GET all jobs (optional filters: q, location, skills, limit)
app.get('/api/jobs', async (req, res) => {
  try {
    const { q = '', location = '', skills = '', limit } = req.query;

    let sql = `SELECT * FROM job_list
               WHERE (job_title LIKE ? OR company LIKE ? OR skills LIKE ?)
               AND location LIKE ?
               AND skills LIKE ?
               ORDER BY job_id DESC`;
    const params = [`%${q}%`, `%${q}%`, `%${q}%`, `%${location}%`, `%${skills}%`];

    if (limit && Number(limit) > 0) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET all interviews with job details
app.get('/api/interviews', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, j.job_title, j.company
       FROM interview_data i
       JOIN job_list j ON i.job_id = j.job_id
       ORDER BY i.interview_date, i.interview_time`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// GET a single job by id
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM job_list WHERE job_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST a new job
app.post('/api/jobs', async (req, res) => {
  try {
    const { job_title, company, location, salary, skills } = req.body;
    if (!job_title || !company || !location || !salary || !skills) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO job_list (job_title, company, location, salary, skills) VALUES (?, ?, ?, ?, ?)',
      [job_title, company, location, salary, skills]
    );
    res.status(201).json({ message: 'Job posted', job_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));