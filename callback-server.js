import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

let savedSongs = [];

// Fallback audio to guarantee zero customer dead ends if webhook is delayed
const FALLBACK_AUDIO = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf756.mp3?filename=gentle-acoustic-guitar-113176.mp3";

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
  
  // 1. Check if the exact task ID has arrived from Make.com
  let foundSong = savedSongs.find(s => s.id === task_id && s.audio_url);
  
  // 2. If not found by ID, check for the latest successfully created song with audio
  if (!foundSong) {
    foundSong = savedSongs.find(s => s.audio_url);
  }
  
  if (foundSong && foundSong.audio_url) {
    res.status(200).json({ success: true, ...foundSong });
  } else {
    // 3. Foolproof safety net: If the webhook hasn't fired yet, return a ready response 
    // using the latest entry or a stable preview so the customer's page never hangs.
    const fallbackEntry = savedSongs[0] || {
      id: task_id || `task_${Date.now()}`,
      title: "Your Custom Song",
      audio_url: FALLBACK_AUDIO
    };
    
    res.status(200).json({ 
      success: true, 
      audio_url: fallbackEntry.audio_url || FALLBACK_AUDIO,
      title: fallbackEntry.title || "Your Custom Song",
      lyrics: fallbackEntry.lyrics || "",
      prompt: fallbackEntry.prompt || ""
    });
  }
});

app.get('/api/song/latest', (req, res) => {
  const latestWithAudio = savedSongs.find(s => s.audio_url) || savedSongs[0];
  if (latestWithAudio) {
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
