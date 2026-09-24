import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// In-memory store for active song sessions
const activeSessions = new Map();

const FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// 1. Intake Endpoint (Called when user clicks submit in Systeme.io)
app.post('/api/song/create', (req, res) => {
  const { token, recipient, name, occasion, genre, memories } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  // Store initial status as processing
  activeSessions.set(token, {
    status: 'processing',
    createdAt: Date.now(),
    details: { recipient, name, occasion, genre, memories }
  });

  console.log(`[SONG START] Token: ${token} | Name: ${name} | Genre: ${genre}`);

  // Automatically mark as completed after 8 seconds and attach working audio
  setTimeout(() => {
    const session = activeSessions.get(token);
    if (session) {
      session.status = 'completed';
      session.audioUrl = FALLBACK_AUDIO;
      activeSessions.set(token, session);
      console.log(`[SONG READY] Token: ${token} is ready for playback!`);
    }
  }, 8000);

  return res.json({ success: true, message: 'Generation initiated' });
});

// 2. Polling Endpoint (Called continuously by the preview page)
app.get('/api/check-status', (req, res) => {
  const token = req.query.token;

  if (!token || !activeSessions.has(token)) {
    return res.json({ status: 'processing' });
  }

  const session = activeSessions.get(token);

  if (session.status === 'completed') {
    return res.json({
      status: 'completed',
      audioUrl: session.audioUrl,
      details: session.details
    });
  }

  return res.json({ status: 'processing' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
