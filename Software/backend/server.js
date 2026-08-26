const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory array to simulate a database for now
const sessions = [];

app.post('/api/sync-session', (req, res) => {
  const sessionData = req.body;
  
  if (!sessionData || !sessionData.program) {
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  sessions.push({
    ...sessionData,
    syncedAtServer: new Date().toISOString()
  });

  console.log(`[SYNC SUCCESS] Received session for Device: ${sessionData.dataValues.find(d => d.dataElement === 'PPH_DEVICE_ID')?.value}`);
  
  // Return success
  return res.status(200).json({ success: true, message: 'Session synchronized to backend' });
});

app.get('/api/sessions', (req, res) => {
  res.json(sessions);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart PPH Backend running on http://0.0.0.0:${PORT}`);
});
