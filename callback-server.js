// In your Express backend (callback-server.js)
let savedSongs = []; // Or your database connection

app.post('/api/song/create', (express.json()), (req, res) => {
  const { title, audio_url, url, audio, lyrics, prompt, recipient, name } = req.body;
  
  const newSong = {
    id: 'song_' + Date.now(),
    title: title || `Song for ${name || 'Customer'} (${recipient || 'Loved One'})`,
    audio_url: audio_url || url || audio || '',
    lyrics: lyrics || prompt || 'No lyrics available.',
    recipient: recipient || 'Loved One',
    name: name || 'Customer',
    timestamp: new Date().toISOString()
  };

  savedSongs.unshift(newSong); // Keep latest at the top
  res.status(200).json({ success: true, song: newSong });
});

app.get('/api/songs/all', (req, res) => {
  res.status(200).json(savedSongs);
});

// Endpoint to handle revision submissions
app.post('/api/revision', express.json(), (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  console.log(`Revision requested for "${songTitle}" (${name} / ${recipient}): ${notes}`);
  // Add your webhook/trigger logic to Make.com or your AI music generator here
  res.status(200).json({ success: true, message: 'Revision request received and processing.' });
});
