import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

let savedSongs = [];

app.post('/api/song/create', (req, res) => {
  const { title, audio_url, url, audio, lyrics, prompt, recipient, name } = req.body;
  
  const newSong = {
    id: `task_${Date.now()}`,
    title: title || `${name || 'Your'} Song`,
    audio_url: audio_url || url || audio || '',
    lyrics: lyrics || '',
    prompt: prompt || '',
    recipient: recipient || '',
    name: name || '',
    timestamp: new Date().toISOString()
  };

  savedSongs.unshift(newSong);
  res.status(200).json({ success: true, message: 'Song saved successfully', song: newSong });
});

app.get('/api/song/status', (req, res) => {
  const { task_id } = req.query;
  const foundSong = savedSongs.find(s => s.id === task_id) || savedSongs[0];
  
  if (foundSong && foundSong.audio_url) {
    res.status(200).json({ success: true, ...foundSong });
  } else {
    res.status(200).json({ success: false, status: 'processing', progress: 95 });
  }
});

app.get('/api/song/latest', (req, res) => {
  if (savedSongs.length > 0) {
    res.status(200).json(savedSongs[0]);
  } else {
    res.status(404).json({ error: 'No songs found' });
  }
});

app.get('/api/songs/all', (req, res) => {
  res.status(200).json(savedSongs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server running on port ${PORT}`);
});
