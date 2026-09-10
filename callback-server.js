import express from 'express';
import cors from 'cors';

const app = express();

// Enable CORS for all incoming requests from your funnels
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// In-memory array database to archive all customer songs for support
let songsDatabase = [];

// Save incoming completed song from Make.com
app.post('/api/song/save', express.json(), (req, res) => {
  const newSong = {
    id: 'song_' + Date.now(),
    title: req.body.title || 'Custom Master Track',
    audio_url: req.body.audio_url || '',
    lyrics: req.body.lyrics || 'No lyrics available.',
    recipient: req.body.recipient || 'Loved One',
    name: req.body.name || 'Valued Customer',
    genre: req.body.genre || 'Love Ballad',
    vocal: req.body.vocal || 'Male and Female Duet',
    timestamp: new Date().toISOString()
  };
  
  // Add to the front of the array so latest is always index 0
  songsDatabase.unshift(newSong);
  
  res.status(200).json({ success: true, totalSaved: songsDatabase.length, song: newSong });
});

// Endpoint to get the latest single song (for customer success page)
app.get('/api/song/latest', (req, res) => {
  res.json(songsDatabase[0] || { title: "No songs yet", audio_url: "", lyrics: "" });
});

// Endpoint to get ALL customer songs for the Admin Support page
app.get('/api/songs/all', (req, res) => {
  res.json(songsDatabase);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
