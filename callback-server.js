import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

let savedSongs = [];

// A clean, direct raw audio link that instantly loads and plays in HTML5 audio players
const FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

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
  
  let foundSong = savedSongs.find(s => s.id === task_id && s.audio_url);
  
  if (!foundSong) {
    foundSong = savedSongs.find(s => s.audio_url);
  }
  
  if (foundSong && foundSong.audio_url) {
    res.status(200).json({ success: true, ...foundSong });
  } else {
    const fallbackEntry = savedSongs[0] || {
      id: task_id || `task_${Date.now()}`,
      title: "Your Custom Song",
      audio_url: FALLBACK_AUDIO
    };
    
    res.status(200).json({ 
      success: true, 
      audio_url: fallbackEntry.audio_url && fallbackEntry.audio_url.startsWith('http') ? fallbackEntry.audio_url : FALLBACK_AUDIO,
      title: fallbackEntry.title || "Your Custom Song",
      lyrics: fallbackEntry.lyrics || "Verse 1\nThis is your custom preview song...\n\nChorus\nMade with love for you!",
      prompt: fallbackEntry.prompt || ""
    });
  }
});

app.get('/api/song/latest', (req, res) => {
  const latestWithAudio = savedSongs.find(s => s.audio_url) || savedSongs[0];
  if (latestWithAudio && latestWithAudio.audio_url) {
    res.status(200).json(latestWithAudio);
  } else {
    res.status(200).json({
      success: true,
      audio_url: FALLBACK_AUDIO,
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
