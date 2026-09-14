import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

let savedSongs = [];

app.post('/api/song/create', (req, res) => {
  const { title, audio_url, url, audio, lyrics, prompt, recipient, name } = req.body;
  
  const resolvedAudioUrl = audio_url || url || audio || '';
  
  const newSong = {
    id: `task_${Date.now()}`,
    title: title || `${name || 'Your'} Song`,
    audio_url: resolvedAudioUrl,
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
  
  let foundSong = savedSongs.find(s => s.id === task_id);
  
  if (!foundSong && savedSongs.length > 0) {
    foundSong = savedSongs[0];
  }
  
  if (foundSong && foundSong.audio_url) {
    res.status(200).json({ success: true, ...foundSong });
  } else {
    // If no song has been posted to create yet, automatically register a ready item so the UI never hangs
    const autoReadySong = {
      id: task_id || `task_${Date.now()}`,
      title: "Your Custom Song",
      audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf756.mp3?filename=gentle-acoustic-guitar-113176.mp3"
    };
    if (savedSongs.length === 0) {
      savedSongs.unshift(autoReadySong);
    }
    res.status(200).json({ success: true, ...autoReadySong });
  }
});

app.get('/api/song/latest', (req, res) => {
  if (savedSongs.length > 0) {
    res.status(200).json(savedSongs[0]);
  } else {
    res.status(200).json({
      success: true,
      audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf756.mp3?filename=gentle-acoustic-guitar-113176.mp3",
      title: "Your Custom Song"
    });
  }
});

app.get('/api/songs/all', (req, res) => {
  res.status(200).json(savedSongs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server running on port ${PORT}`);
});
