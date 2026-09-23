import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

app.use(cors());
app.use(express.json());

let savedSongs = [];
// In-memory session tracker for frontend polling
const activeSessions = new Map();

// A clean, direct raw audio link that instantly loads and plays in HTML5 audio players
const FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

app.post('/api/song/create', (req, res) => {
  // Existing route logic
  res.json({ success: true });
});

// Frontend Polling Endpoint for Systeme.io
app.get('/api/check-status', (req, res) => {
  const { token } = req.query;
  const session = activeSessions.get(token);
  if (!session) {
    return res.json({ status: 'pending', audioUrl: null });
  }
  res.json(session);
});

// Added missing POST route for song generation
app.post('/api/generate', async (req, res) => {
  res.json({ success: true, message: "Generation started" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
