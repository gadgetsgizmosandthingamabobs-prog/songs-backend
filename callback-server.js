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

// In-memory storage for active tasks and latest song
let latestSong = {
    title: "Custom Master Track",
    audio_url: "",
    lyrics: "Default lyrics placeholder",
    recipient: "Loved One",
    name: "Valued Customer"
};

let taskStore = {};

// Song update endpoint for Make.com
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

// Get song data by specific task ID (supports frontend preview lookups)
app.get('/api/song/:task_id', (req, res) => {
    const { task_id } = req.params;
    const song = taskStore[task_id] || latestSong;
    res.status(200).json(song);
});

// Fallback status/latest song endpoint
app.get('/api/song/latest', (req, res) => {
    res.status(200).json(latestSong);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
