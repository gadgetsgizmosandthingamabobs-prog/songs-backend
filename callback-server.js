const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for song details and contact messages
let latestSong = {
  title: "Custom Master Track",
  audio_url: "https://cdn.systeme.io/your-default-audio.mp3",
  lyrics: "Default lyrics placeholder",
  recipient: "Loved One",
  name: "Valued Customer"
};

// Array to store contact submissions
let contactMessages = [];

// Endpoint to get the latest song details
app.get('/api/song/latest', (req, res) => {
  res.json(latestSong);
});

// Endpoint to handle song revision requests
app.post('/api/revision', async (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  console.log(`Revision requested for "${songTitle}" (Recipient: ${name} / ${recipient})`);
  console.log(`Notes / Changes requested: ${notes}`);
  res.status(200).json({ success: true, message: 'Revision request received.' });
});

// Endpoint to handle contact form submissions
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  
  const newMessage = {
    id: Date.now(),
    name: name || 'Anonymous',
    email: email || 'No email provided',
    message: message || 'No message content',
    date: new Date().toLocaleString()
  };

  // Save to the beginning of the array so newest messages show first
  contactMessages.unshift(newMessage);
  
  console.log(`New message saved from ${newMessage.name} (${newMessage.email})`);
  res.status(200).json({ success: true, message: 'Message saved successfully!' });
});

// Endpoint for your admin dashboard to fetch all messages
app.get('/api/admin/messages', (req, res) => {
  res.json(contactMessages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
