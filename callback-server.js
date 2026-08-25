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

let latestSong = {
  title: "Custom Master Track",
  audio_url: "https://cdn.systeme.io/your-default-audio.mp3",
  lyrics: "Default lyrics placeholder",
  recipient: "Loved One",
  name: "Valued Customer"
};

let contactMessages = [];

app.get('/api/song/latest', (req, res) => {
  res.json(latestSong);
});

app.post('/api/revision', async (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  console.log(`Revision requested for "${songTitle}" (${name} / ${recipient}): ${notes}`);
  res.status(200).json({ success: true, message: 'Revision request received.' });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  const newMessage = {
    id: Date.now(),
    name: name || 'Anonymous',
    email: email || 'No email provided',
    message: message || 'No message content',
    date: new Date().toLocaleString()
  };
  contactMessages.unshift(newMessage);
  console.log(`New message saved from ${newMessage.name}`);
  res.status(200).json({ success: true, message: 'Message saved successfully!' });
});

app.get('/api/admin/messages', (req, res) => {
  res.json(contactMessages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
