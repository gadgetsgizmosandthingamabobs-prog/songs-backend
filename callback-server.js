import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

let latestSong = {
  title: "Custom Master Track",
  audio_url: "",
  lyrics: "Please do not leave or refresh this page while your song is being generated.",
  recipient: "Loved One",
  name: "Valued Customer",
  genre: "Country",
  vocal: "Female"
};

const tasks = {};

// Helper: Formats strict style tags putting lead vocal constraints FIRST
function buildStrictStyleTags(vocalChoice, genreChoice) {
  let vocalTag = "";
  const vocal = (vocalChoice || "").toLowerCase();

  if (vocal.includes('female')) {
    vocalTag = "female vocals, clear lead female voice, soft female singer";
  } else if (vocal.includes('male')) {
    vocalTag = "male vocals, clear lead male voice, warm male singer";
  } else if (vocal.includes('duet')) {
    vocalTag = "duet, male and female vocals, vocal harmony";
  } else {
    vocalTag = "female vocals, clear lead female voice"; // Default fallback
  }

  let genreTag = "";
  const genre = (genreChoice || "").toLowerCase();

  if (genre.includes('country')) {
    genreTag = "country ballad, acoustic guitar, gentle steel guitar, warm melody";
  } else if (genre.includes('pop')) {
    genreTag = "acoustic pop, strummed acoustic guitar, warm baseline";
  } else if (genre.includes('ballad') || genre.includes('love')) {
    genreTag = "emotional love ballad, acoustic piano, romantic strings, 75bpm";
  } else {
    genreTag = `${genreChoice || "acoustic love ballad"}, heartfelt rhythm`;
  }

  return `${vocalTag}, ${genreTag}`;
}

// Handler for incoming generation requests from form
app.post('/api/generate-song', async (req, res) => {
  try {
    const { 
      task_id,
      userVocalChoice, 
      userGenreChoice, 
      vocal,
      genre,
      userLyrics, 
      lyrics,
      songTitle,
      title,
      recipient,
      name
    } = req.body;

    const chosenVocal = userVocalChoice || vocal || "Female";
    const chosenGenre = userGenreChoice || genre || "Country";
    const chosenLyrics = userLyrics || lyrics || "Heartfelt custom song lyrics";
    const chosenTitle = songTitle || title || "Song for " + (name || "Loved One");
    const currentTaskId = task_id || `task_${Date.now()}`;

    // Enforce strict vocal tag priority
    const strictStyleTags = buildStrictStyleTags(chosenVocal, chosenGenre);

    console.log(`[LOG] Starting Generation Task: ${currentTaskId}`);
    console.log(`[LOG] Style Payload: "${strictStyleTags}"`);

    // Initialize track state
    latestSong = {
      title: chosenTitle,
      audio_url: "",
      lyrics: chosenLyrics,
      recipient: recipient || "Loved One",
      name: name || "Valued Customer",
      genre: chosenGenre,
      vocal: chosenVocal,
      styleTags: strictStyleTags
    };

    tasks[currentTaskId] = { ...latestSong, status: "processing" };

    // =========================================================================
    // TRIGGER MUSIC GENERATION API
    // =========================================================================
    const SUNO_API_URL = process.env.SUNO_API_URL || 'https://api.suno.ai/v1/generate';
    const SUNO_API_KEY = process.env.SUNO_API_KEY || '';

    if (SUNO_API_KEY || process.env.SUNO_API_URL) {
      const apiResponse = await axios.post(SUNO_API_URL, {
        prompt: chosenLyrics,
        style: strictStyleTags,
        title: chosenTitle,
        customMode: true,
        instrumental: false,
        callBackUrl: `https://${req.get('host')}/callback`
      }, {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[LOG] Music API accepted request for ${currentTaskId}`);

      // If API returns audio directly
      if (apiResponse.data && apiResponse.data.audio_url) {
        latestSong.audio_url = apiResponse.data.audio_url;
        tasks[currentTaskId].audio_url = apiResponse.data.audio_url;
        tasks[currentTaskId].status = "completed";
      }
    }

    return res.status(200).json({
      success: true,
      task_id: currentTaskId,
      styleTagsUsed: strictStyleTags,
      data: tasks[currentTaskId]
    });

  } catch (error) {
    console.error("[ERROR] API Generation request failed:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to communicate with music engine", 
      details: error.response?.data || error.message 
    });
  }
});

// Incoming Webhook / Callback Handler
app.post('/callback', (req, res) => {
  const { task_id, audio_url, status, data } = req.body;
  const targetUrl = audio_url || (data && data.audio_url);
  const targetTaskId = task_id || (data && data.task_id);

  if (targetUrl) {
    latestSong.audio_url = targetUrl;
    if (targetTaskId && tasks[targetTaskId]) {
      tasks[targetTaskId].audio_url = targetUrl;
      tasks[targetTaskId].status = status || "completed";
    }
    console.log(`[LOG] Callback received. Audio URL updated for ${targetTaskId}: ${targetUrl}`);
  }
  
  res.status(200).json({ received: true });
});

// Polling endpoint for frontend preview page
app.get('/preview-results', (req, res) => {
  const taskId = req.query.task_id;
  
  if (taskId && tasks[taskId]) {
    return res.json(tasks[taskId]);
  }
  
  res.json(latestSong);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server listening on port ${PORT}`);
});
