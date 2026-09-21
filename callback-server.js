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
  const { title, audio_url, url, audio, lyrics, prompt, recipient, name, token } = req.body;
  const resolvedAudioUrl = audio_url || url || audio || '';

  if (token) {
    if (resolvedAudioUrl) {
      activeSessions.set(token, { status: 'completed', audioUrl: resolvedAudioUrl });
    } else {
      activeSessions.set(token, { status: 'pending', audioUrl: null });
    }
  }

  savedSongs.push({ title, audioUrl: resolvedAudioUrl, lyrics, prompt, recipient, name, timestamp: new Date() });
  res.json({ success: true, message: 'Song request logged successfully' });
});

// Secure MusicAPI Webhook Receiver
app.post('/api/music-webhook', express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}), (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  const signatureHeader = req.headers['x-webhook-signature'];

  if (!timestamp || !signatureHeader) {
    return res.status(400).send('Missing webhook headers');
  }

  // Verify HMAC signature
  const webhookSecret = process.env.WEBHOOK_SECRET || 'your_secure_random_string';
  const message = `${timestamp}.${req.rawBody}`;
  const computedSignature = `sha256=${crypto.createHmac('sha256', webhookSecret).update(message).digest('hex')}`;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computedSignature))) {
      return res.status(400).send('Invalid signature');
    }
  } catch (e) {
    return res.status(400).send('Signature verification failed');
  }

  // Acknowledge receipt immediately
  res.status(200).json({ received: true });

  const { status, audio_url } = req.body;

  // When MusicAPI finishes rendering, update active sessions with the audio URL
  if (status === 'succeeded' && audio_url) {
    for (let [token, data] of activeSessions.entries()) {
      if (data.status === 'pending') {
        activeSessions.set(token, { status: 'completed', audioUrl: audio_url });
      }
    }
  }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
