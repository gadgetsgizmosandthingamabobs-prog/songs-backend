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
  lyrics: "Please do not leave or refresh this page while your song is being generated.",
  recipient: "Loved One",
  name: "Valued Customer",
  genre: "Love Ballad",
  vocal: "Male and Female Duet"
};

app.post('/api/song/save', express.json(), (req, res) => {
  latestSong = {
    title: req.body.title || latestSong.title,
    audio_url: req.body.audio_url || latestSong.audio_url,
    lyrics: req.body.lyrics || latestSong.lyrics,
    recipient: req.body.recipient || latestSong.recipient,
    name: req.body.name || latestSong.name,
    genre: req.body.genre || latestSong.genre,
    vocal: req.body.vocal || latestSong.vocal,
  };
  res.status(200).json({ success: true, latestSong });
});

app.get('/api/song/latest', (req, res) => {
  res.json(latestSong);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
