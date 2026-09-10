// Store customer song versions/revisions
let songRevisionsDB = {};

// Save revision request & generate updated entry
app.post('/api/revision', express.json(), (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;
  
  const revisedSong = {
    id: 'rev_' + Date.now(),
    title: `${songTitle || 'Custom Song'} (Revision)`,
    audio_url: songsDatabase[0] ? songsDatabase[0].audio_url : '', // Links latest generated asset or updated render
    lyrics: `Revision Notes: ${notes}\n\n-- ORIGINAL LYRICS --\n` + (songsDatabase[0] ? songsDatabase[0].lyrics : ''),
    recipient: recipient || 'Loved One',
    name: name || 'Customer',
    timestamp: new Date().toISOString()
  };

  // Archive in database
  songsDatabase.unshift(revisedSong);

  res.status(200).json({ success: true, message: 'Revision processed successfully', song: revisedSong });
});
