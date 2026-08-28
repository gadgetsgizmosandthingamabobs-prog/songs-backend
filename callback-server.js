const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all incoming requests from your funnels
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// In-memory storage for active tasks and latest song
let latestSong = {
  title: "Custom Master Track",
  audio_url: "",
  lyrics: "Default lyrics placeholder",
  recipient: "Loved One",
  name: "Valued Customer"
};

let taskStore = {};

// Endpoint for Make.com to update when song generation finishes
app.post('/api/song/update', (req, res) => {
  const { task_id, audio_url, title, recipient, name, lyrics } = req.body;
  
  const songData = {
    title: title || "Custom Master Track",
    audio_url: audio_url || "",
    lyrics: lyrics || "",
    recipient: recipient || "Loved One",
    name: name || "Valued Customer"
  };

  if (task_id) {
    taskStore[task_id] = songData;
  }
  latestSong = songData;

  res.status(200).json({ success: true, message: "Song updated successfully" });
});

// Endpoint to check status by specific task_id
app.get('/api/song/status', (req, res) => {
  const taskId = req.query.task_id;
  if (taskId && taskStore[taskId]) {
    return res.status(200).json(taskStore[taskId]);
  }
  if (latestSong.audio_url) {
    return res.status(200).json(latestSong);
  }
  res.status(404).json({ error: "Song not found or still processing" });
});

// Fallback endpoint for latest song
app.get('/api/song/latest', (req, res) => {
  res.status(200).json(latestSong);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
