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
  lyrics: "Please do not leave or refresh this page while your song is being generated. Default lyrics placeholder",
  recipient: "Loved One",
  name: "Valued Customer",
  genre: "Love Ballad",
  vocal: "Female"
};

// Map incoming vocal & genre options into strict music model tags
function generateStyleTags(vocalChoice, genreChoice) {
  let vocalTag = "";
  if (vocalChoice?.toLowerCase() === 'female') {
    vocalTag = "female vocals, clear lead female voice, soft female singer";
  } else if (vocalChoice?.toLowerCase() === 'male') {
    vocalTag = "male vocals, clear lead male voice, warm male singer";
  } else if (vocalChoice?.toLowerCase() === 'duet') {
    vocalTag = "duet, male and female vocals, alternating lead singers, vocal harmony";
  } else {
    vocalTag = "female vocals, clear lead female voice"; // Default safety fallback
  }

  let genreTag = "";
  if (genreChoice?.toLowerCase().includes('ballad')) {
    genreTag = "emotional love ballad, acoustic piano, romantic strings, soft melody, 75bpm";
  } else if (genreChoice?.toLowerCase().includes('pop')) {
    genreTag = "acoustic pop, strummed acoustic guitar, warm bassline, uplifting rhythm";
  } else {
    genreTag = "heartfelt love ballad, piano arrangement, gentle strings";
  }

  // VOCAL TAGS MUST BE PLACED FIRST
  return `${vocalTag}, ${genreTag}`;
}

// Endpoint to trigger music generation
app.post('/api/generate-song', async (req, res) => {
  try {
    const { 
      userVocalChoice, 
      userGenreChoice, 
      userLyrics, 
      songTitle,
      recipient,
      name
    } = req.body;

    const strictStyleTags = generateStyleTags(userVocalChoice, userGenreChoice);

    console.log(`[LOG] Generating song: "${songTitle}"`);
    console.log(`[LOG] Formatted Style Tags Payload: "${strictStyleTags}"`);

    // Update in-memory track state
    latestSong = {
      title: songTitle || "Custom Master Track",
      audio_url: "", // Will be populated when webhook completes
      lyrics: userLyrics || latestSong.lyrics,
      recipient: recipient || latestSong.recipient,
      name: name || latestSong.name,
      genre: userGenreChoice || "Love Ballad",
      vocal: userVocalChoice || "Female"
    };

    // Construct payload for external generation API
    const apiPayload = {
      customMode: true,
      instrumental: false,
      prompt: userLyrics,
      style: strictStyleTags,
      title: songTitle || "Custom Master Track"
    };

    // Forward apiPayload to your music API endpoint here if making an external fetch/axios request
    
    return res.status(200).json({
      success: true,
      message: "Song generation initiated",
      styleTagsUsed: strictStyleTags,
      songData: latestSong
    });

  } catch (error) {
    console.error("[ERROR] Song generation failed:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to fetch preview result
app.get('/preview-results', (req, res) => {
  res.json(latestSong);
});

// Port configuration for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server listening on port ${PORT}`);
});
