import fetch from "node-fetch";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Store recent completed songs in memory by taskId
let completedSongs = new Map();
let latestSong = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Trigger generation (called by generator page)
app.post('/api/generate', async (req, res) => {
    try {
        const payload = req.body;
        const taskId = payload.task_id || ('task_' + Date.now());
        
        res.status(200).json({ success: true, task_id: taskId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Endpoint for Make.com to POST the completed audio URL
app.post('/api/song/update', (req, res) => {
  const { task_id, audio_url } = req.body;
  
  if (!task_id || !audio_url) {
    return res.status(400).json({ error: 'task_id and audio_url are required' });
  }

  completedSongs.set(task_id, { audio_url });
  latestSong = { task_id, audio_url };

  console.log(`Saved audio URL for task_id: ${task_id}`);
  return res.status(200).json({ success: true });
});

// 3. Endpoint for frontend preview page to poll for the song
app.get('/api/song/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  if (completedSongs.has(taskId)) {
    return res.json({ audio_url: completedSongs.get(taskId).audio_url });
  } else if (taskId === 'latest' && latestSong) {
    return res.json({ audio_url: latestSong.audio_url });
  } else {
    return res.status(404).json({ error: 'Song still processing or not found' });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
