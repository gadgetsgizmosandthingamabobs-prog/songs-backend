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
// (Your existing generator routes remain here...)

// 2. Endpoint to fetch the latest song details (used by your /downloads page)
app.get('/api/song/latest', (req, res) => {
  if (!latestSong) {
    return res.status(404).json({ error: "No songs generated yet" });
  }
  res.json(latestSong);
});

// 3. Handle incoming revision requests from the downloads page
app.post('/api/revision', async (req, res) => {
  const { recipient, name, notes, songTitle } = req.body;

  console.log(`Received revision request for ${name} (${recipient}): ${notes}`);

  try {
    // Here is where you can trigger your music generation engine (e.g. Suno/MusicAPI)
    // For now, we update the latestSong variable with the revised info/audio URL
    
    const updatedAudioUrl = "https://your-audio-storage.com/revised-song.mp3"; // Replace with your engine's output URL when ready

    latestSong = {
      title: `${songTitle || 'Custom Song'} (Revised)`,
      audio_url: updatedAudioUrl,
      lyrics: `Revised notes: ${notes}`,
      recipient: recipient,
      name: name
    };

    res.status(200).json({ 
      success: true, 
      message: 'Revision request received and latest song updated successfully!',
      audio_url: updatedAudioUrl 
    });

  } catch (error) {
    console.error('Error handling revision:', error);
    res.status(500).json({ success: false, error: 'Failed to process song revision.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
