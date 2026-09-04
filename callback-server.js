import express from 'express';
import cors from 'cors';

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

// Enforces lead vocal constraints FIRST in style string
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
    vocalTag = "female vocals, clear lead female voice";
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

// Processing endpoint
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

    const strictStyleTags = buildStrictStyleTags(chosenVocal, chosenGenre);

    console.log(`[LOG] Starting Generation Task: ${currentTaskId}`);
    console.log(`[LOG] Style Payload: "${strictStyleTags}"`);

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

    const SUNO_API_URL = process.env.SUNO_API_URL;
    const SUNO_API_KEY = process.env.SUNO_API_KEY;

    // Trigger API call using native fetch if environment variables are set
    if (SUNO_API_URL) {
      const response = await fetch(SUNO_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: chosenLyrics,
          style: strictStyleTags,
          title: chosenTitle,
          customMode: true,
          instrumental: false,
          callBackUrl: `https://${req.get('host')}/callback`
        })
      });

      const apiData = await response.json();
      console.log(`[LOG] Music API Response for ${currentTaskId}:`, apiData);

      if (apiData && apiData.audio_url) {
        latestSong.audio_url = apiData.audio_url;
        tasks[currentTaskId].audio_url = apiData.audio_url;
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
    console.error("[ERROR] Generation failed:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook Callback handler
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
    console.log(`[LOG] Callback updated audio URL for ${targetTaskId}: ${targetUrl}`);
  }
  
  res.status(200).json({ received: true });
});

// Polling endpoint for frontend preview
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
