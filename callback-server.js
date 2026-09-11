import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let savedSongs = [];

app.post('/api/song/create', (req, res) => {
  const { title, audio_url, url, audio, lyrics, prompt, recipient, name } = req.body;
  
  const newSong = {
    id: 'song_' + Date.now(),
    title: title || `Song for ${name || 'Customer'} (${recipient || 'Loved One'})`,
    audio_url: audio_url || url || audio || '',
    lyrics: lyrics || prompt || 'No lyrics available.',
    recipient: recipient || 'Loved One',
    name: name || 'Customer',
    timestamp: new Date().toISOString()
  };

  savedSongs.unshift(newSong);
  res.status(200).json({ success: true, song: newSong });
});

app.get('/api/songs/all', (req, res) => {
  res.status(200).json(savedSongs);
});

app.post('/api/revision', (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  console.log(`Revision requested for "${songTitle}" (${name} / ${recipient}): ${notes}`);
  res.status(200).json({ success: true, message: 'Revision request received and processing.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
