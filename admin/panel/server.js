const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Generate a secure random secret key
const secretKey = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to false if not using HTTPS
}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Replace with your MySQL password
  database: 'FYP'
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database.');
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

  connection.query('SELECT * FROM Admin WHERE UserName = ? AND pw = ?', [username, hashedPassword], (err, results) => {
    if (err) {
      console.error('Error during login:', err);
      res.status(500).send('Server error');
      return;
    }

    if (results.length > 0) {
      req.session.user = results[0];
      console.log('Session set:', req.session);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// DashBoard 
app.get('/chat-interactions', (req, res) => {
  connection.query('SELECT ChatID, COUNT(*) AS totalInteractions FROM Chat GROUP BY ChatID', (err, results) => {
    if (err) {
      console.error('Error fetching chat interactions:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results);
  });
});

app.get('/total-live-sessions', (req, res) => {
  connection.query('SELECT COUNT(*) AS totalLiveSessions FROM livesession', (err, results) => {
    if (err) {
      console.error('Error fetching total live sessions:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results[0]);
  });
});

app.get('/total-ratings', (req, res) => {
  connection.query('SELECT COUNT(*) AS totalRatings FROM livesession', (err, results) => {
    if (err) {
      console.error('Error fetching total ratings:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results[0]);
  });
});

app.get('/dashboard-updates', (req, res) => {
  const queriesQuery = 'SELECT UnansweredQuery FROM unansweredqueries ORDER BY UnansweredQuery_id DESC LIMIT 5';
  const commentsQuery = 'SELECT Comment FROM livesession ORDER BY LiveSession_id DESC LIMIT 5';
  const ratingQuery = 'SELECT Rating FROM livesession ORDER BY LiveSession_id DESC LIMIT 5';

  // Fetch latest unanswered queries
  connection.query(queriesQuery, (err, queries) => {
    if (err) {
      console.error('Error fetching unanswered queries:', err);
      res.status(500).send('Server error');
      return;
    }

    // Fetch latest comments
    connection.query(commentsQuery, (err, comments) => {
      if (err) {
        console.error('Error fetching live chat comments:', err);
        res.status(500).send('Server error');
        return;
      }

      // Fetch latest ratings
      connection.query(ratingQuery, (err, ratings) => {
        if (err) {
          console.error('Error fetching live chat ratings:', err);
          res.status(500).send('Server error');
          return;
        }

        // Respond with the combined results
        res.json({
          latestQueries: queries.map(row => row.UnansweredQuery),
          latestComments: comments.map(row => row.Comment),
          latestRatings: ratings.slice(0, 5).map(row => row.Rating) // Limit ratings to 5
        });
      });
    });
  });
});

// FAQ database
app.get('/faqs/:id', (req, res) => {
  const id = req.params.id;
  connection.query('SELECT * FROM FAQ WHERE FAQID = ?', [id], (error, results) => {
      if (error) {
          res.status(500).send(error);
      } else {
          res.status(200).json(results[0]);
      }
  });
});

app.get('/faqs', (req, res) => {
  const cti = req.query.cti === 'true' ? 1 : 0;
  connection.query('SELECT FAQID, question, answer, CTI FROM faq WHERE CTI = ?', [cti], (err, results) => {
    if (err) {
      console.error('Error fetching FAQs:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results);
  });
});

app.post('/faqs', (req, res) => {
  const { question, answer, cti } = req.body;
  
  // Assuming you want to set a default ChatbotID, you can adjust as needed
  const chatbotID = 1; // Replace with the appropriate ChatbotID

  const query = 'INSERT INTO FAQ (question, answer, CTI, ChatbotID) VALUES (?, ?, ?, ?)';
  
  connection.query(query, [question, answer, cti, chatbotID], (err, result) => {
    if (err) {
      console.error('Error inserting FAQ:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json({ success: true, insertId: result.insertId });
  });
});

app.get('/faqs/:id', (req, res) => {
  const id = req.params.id;
  connection.query('SELECT FAQID, question, answer, CTI FROM faq WHERE FAQID = ?', [id], (err, results) => {
      if (err) {
          console.error('Error fetching FAQ:', err);
          res.status(500).send('Server error');
          return;
      }
      if (results.length > 0) {
          res.json(results[0]);
      } else {
          res.status(404).send('FAQ not found');
      }
  });
});

// View FAQ
function handleRead(event) {
  const id = event.target.getAttribute('data-id');

  // Fetch the data for the selected FAQ
  fetch(`http://localhost:3000/faqs/${id}`)
      .then(response => response.json())
      .then(data => {
          document.getElementById('view-faq-question').value = data.question;
          document.getElementById('view-faq-answer').value = data.answer;
          document.getElementById('view-faq-cti').value = data.CTI;
          document.getElementById('view-form-container').style.display = 'block';
      })
      .catch(error => console.error('Error fetching FAQ data:', error));
}

// Update FAQ
app.put('/faqs/:id', (req, res) => {
  const id = req.params.id;
  const { question, answer, cti } = req.body;
  
  const query = 'UPDATE FAQ SET question = ?, answer = ?, CTI = ? WHERE FAQID = ?';
  
  connection.query(query, [question, answer, cti, id], (err, result) => {
      if (err) {
          console.error('Error updating FAQ:', err);
          res.status(500).send('Server error');
          return;
      }
      res.json({ success: true });
  });
});

// Delete FAQ
app.delete('/faqs/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM FAQ WHERE FAQID = ?', [id], (err, result) => {
      if (err) {
          console.error('Error deleting FAQ:', err);
          res.status(500).send('Server error');
          return;
      }
      if (result.affectedRows > 0) {
          res.json({ success: true });
      } else {
          res.status(404).send('FAQ not found');
      }
  });
});

// Unanswered Queries
app.get('/unanswered-queries', (req, res) => {
  connection.query('SELECT UnansweredQuery_id, UnansweredQuery FROM unansweredqueries WHERE UnansweredQuery IS NOT NULL', (err, results) => {
    if (err) {
      console.error('Error fetching unanswered queries:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results);
  });
});

// Delete Unanswered Questions
app.delete('/unanswered-queries/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM unansweredqueries WHERE UnansweredQuery_id = ?', [id], (err, result) => {
      if (err) {
          console.error('Error deleting unanswered query:', err);
          res.status(500).send('Server error');
          return;
      }
      if (result.affectedRows > 0) {
          res.json({ success: true });
      } else {
          res.status(404).send('Query not found');
      }
  });
});

// Read Unanwered Queries 
app.get('/unanswered-queries/:id', (req, res) => {
  const id = req.params.id;
  connection.query('SELECT UnansweredQuery FROM unansweredqueries WHERE UnansweredQuery_id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error fetching unanswered query:', err);
      res.status(500).send('Server error');
      return;
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).send('Query not found');
    }
  });
});

// Live Chat
app.get('/livechat-feedback', (req, res) => {
  connection.query('SELECT LiveSession_id, Rating, Comment, Email, Date FROM livesession', (err, results) => {
    if (err) {
      console.error('Error fetching live chat feedback:', err);
      res.status(500).send('Server error');
      return;
    }
    res.json(results);
  });
});

// Live Chat Delete
app.delete('/livechat-feedback/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM livesession WHERE LiveSession_id = ?', [id], (err, result) => {
      if (err) {
          console.error('Error deleting live chat feedback:', err);
          res.status(500).send('Server error');
          return;
      }
      if (result.affectedRows > 0) {
          res.json({ success: true });
      } else {
          res.status(404).send('Live chat feedback not found');
      }
  });
});

// Settings
app.post('/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const hashedCurrentPassword = crypto.createHash('sha1').update(currentPassword).digest('hex');
  const hashedNewPassword = crypto.createHash('sha1').update(newPassword).digest('hex');

  // Check current password
  connection.query('SELECT * FROM Admin WHERE admin_id = ? AND pw = ?', [userId, hashedCurrentPassword], (err, results) => {
      if (err) {
          console.error('Error checking current password:', err);
          return res.status(500).send('Server error');
      }

      if (results.length === 0) {
          console.log('Current password is incorrect for user ID:', userId);
          return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      // Update password
      connection.query('UPDATE Admin SET pw = ? WHERE admin_id = ?', [hashedNewPassword, userId], (err, result) => {
          if (err) {
              console.error('Error updating password for user ID:', userId, err);
              return res.status(500).send('Server error');
          }

          console.log('Password updated successfully for user ID:', userId);
          res.json({ success: true });
      });
  });
});

// Add Admin 
app.post('/add-admin', (req, res) => {
  const { username, password, email, phoneNo } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }

  // Validate phone number format (exactly 8 digits)
  const phoneRegex = /^\d{8}$/;
  if (!phoneRegex.test(phoneNo)) {
    return res.status(400).json({ success: false, message: 'Phone number must be exactly 8 digits' });
  }

  // Check if username already exists
  connection.query('SELECT * FROM Admin WHERE UserName = ?', [username], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      // Username already exists
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // Default ChatbotID
    const chatbotID = 1; 

    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    const query = 'INSERT INTO Admin (UserName, pw, email, phoneNo, ChatbotID) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [username, hashedPassword, email, phoneNo, chatbotID], (err, result) => {
      if (err) {
        console.error('Error adding admin:', err);
        return res.status(500).send('Server error');
      }

      res.json({ success: true, insertId: result.insertId });
    });
  });
});

// Generate pdf
app.post('/generate-pdf', (req, res) => {
  const selectedYear = req.body.year;
  console.log('Generate PDF endpoint hit'); // Debugging line
  console.log('Selected Year:', selectedYear); // Debugging line

  // Specify the full path to the Python executable
  const pythonPath = 'C:/Users/user/AppData/Local/Programs/Python/Python312/python.exe'; // Update as necessary

  // Use path.resolve to ensure the correct absolute path
  const scriptPath = path.resolve('C:/Users/user/Documents/FYP/admin/Generate-Test.py'); // Ensure this is correct

  console.log('Python Path:', pythonPath);
  console.log('Script Path:', scriptPath);

  exec(`"${pythonPath}" "${scriptPath}" "${selectedYear}"`, (error, stdout, stderr) => {
      if (error) {
          console.error(`Error executing script: ${error}`);
          console.error(`stderr: ${stderr}`);
          return res.status(500).send('Error generating PDF');
      }

      console.log(`Script output: ${stdout}`);
      res.send('PDF generated successfully');
  });
});

app.get('/available-years', (req, res) => {
    const query = `
        SELECT DISTINCT YEAR(dateTime) AS year
        FROM (
            SELECT dateTime FROM Chat
            UNION 
            SELECT Date FROM livesession
        ) AS combined
        ORDER BY year DESC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching available years:', err);
            res.status(500).send('Error fetching available years');
        } else {
            res.json(results.map(row => row.year));
        }
    });
});

// Route to fetch chat metrics
app.get('/chat-metrics', (req, res) => {
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    const year = req.query.year || currentYear;
  
    const query = `
        SELECT
            DATE_FORMAT(c.dateTime, '%Y-%m') AS month,
            SUM(c.Ishelpful) / NULLIF(SUM(c.Ishelpful) + SUM(c.Nothelpful), 0) AS averageSatisfaction,
            SUM(c.gotLiveSession) / NULLIF(COUNT(*), 0) AS escalationRate,
            SUM(c.Hallucination) / NULLIF(SUM(c.queryRelevant), 0) AS hallucinationRate,
            SUM(c.answerRelevant) / NULLIF(SUM(c.queryRelevant), 0) AS generationEfficiency,
            SUM(c.answerNotRelevant) / NULLIF(SUM(c.queryRelevant), 0) AS irrelevantGenerationRate,
            SUM(c.NoOfQuery) / NULLIF(COUNT(*), 0) AS averageQueryPerVisitor,
            SUM(c.answerAvailable) / NULLIF(SUM(c.NoOfQuery), 0) AS answerRate,
            AVG(c.generationTime) AS generationTime
        FROM Chat c
        LEFT JOIN chat_has_livesession l ON c.ChatID = l.ChatID
        WHERE YEAR(c.dateTime) = ?
        GROUP BY month
        ORDER BY month
    `;

    connection.query(query, [year], (err, results) => {
        if (err) {
            console.error('Error fetching chat metrics:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});

// Route to fetch live session metrics
app.get('/livesession-metrics', (req, res) => {
    const year = req.query.year || '2024'; // Default to 2024 if no year is specified

    const query = `
        SELECT
            DATE_FORMAT(ls.Date, '%Y-%m') AS month,
            AVG(ls.Rating) AS avg_rating,
            COUNT(DISTINCT ls.LiveSession_id) AS total_count
        FROM livesession ls
        WHERE YEAR(ls.Date) = ?
        GROUP BY month
        ORDER BY month
    `;

    connection.query(query, [year], (err, results) => {
        if (err) {
            console.error('Error fetching live session metrics:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});

// For helpful not helpful
app.get('/helpful-metrics', (req, res) => {
  const year = req.query.year || new Date().getFullYear();

  const query = `
      SELECT
          SUM(c.Ishelpful) AS totalHelpful,
          SUM(c.Nothelpful) AS totalNotHelpful
      FROM Chat c
      WHERE YEAR(c.dateTime) = ?
  `;

  connection.query(query, [year], (err, results) => {
      if (err) {
          console.error('Error fetching helpful metrics:', err);
          res.status(500).send('Server error');
          return;
      }
      res.json(results[0]);
  });
});

// Route to generate PDF (Placeholder)
app.post('/generate-pdf', (req, res) => {
    res.send('PDF generation functionality is not implemented yet.');
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

