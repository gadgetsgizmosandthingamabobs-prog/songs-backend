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
