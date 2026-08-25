const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for the latest song and revisions (or connect to your database)
let latestSong = {
  title: "Custom Master Track",
  audio_url: "https://cdn.systeme.io/your-default-audio.mp3",
  lyrics: "Default lyrics placeholder",
  recipient: "Loved One",
  name: "Valued Customer"
};

// Endpoint to get the latest song details
app.get('/api/song/latest', (req, res) => {
  res.json(latestSong);
});

// Endpoint to handle song revision requests
app.post('/api/revision', async (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  
  console.log(`Revision requested for "${songTitle}" (Recipient: ${name} / ${recipient})`);
  console.log(`Notes / Changes requested: ${notes}`);

  // Here you can add your automated trigger (like calling Suno/MusicAPI or notifying Make.com)

  res.status(200).json({ 
    success: true, 
    message: 'Revision request received and queued for production.' 
  });
});

// Endpoint to handle contact form submissions
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  
  console.log(`New Contact Message Received:`);
  console.log(`- Name: ${name}`);
  console.log(`- Email: ${email}`);
  console.log(`- Message: ${message}`);

  // This logs the submission directly in your Render server logs.
  res.status(200).json({ 
    success: true, 
    message: 'Message received successfully!' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
