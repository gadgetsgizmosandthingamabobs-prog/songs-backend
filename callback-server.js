import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// In-memory store for generated tracks and task tracking
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

// Handler for incoming webhooks / generation requests
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
      name,
      audio_url,
      audioUrl
    } = req.body;

    const chosenVocal = userVocalChoice || vocal || "Female";
    const chosenGenre = userGenreChoice || genre || "Country";
    const chosenLyrics = userLyrics || lyrics || latestSong.lyrics;
    const chosenTitle = songTitle || title || "Custom Master Track";
    const finalAudioUrl = audio_url || audioUrl || "";

    // Generate style string prioritizing vocal tags
    const strictStyleTags = buildStrictStyleTags(chosenVocal, chosenGenre);

    console.log(`[LOG] Processing generation task: ${task_id || 'direct'}`);
    console.log(`[LOG] Applied Style Payload: "${strictStyleTags}"`);

    // Update global preview state
    latestSong = {
      title: chosenTitle,
      audio_url: finalAudioUrl,
      lyrics: chosenLyrics,
      recipient: recipient || latestSong.recipient,
      name: name || latestSong.name,
      genre: chosenGenre,
      vocal: chosenVocal,
      styleTags: strictStyleTags
    };

    if (task_id) {
      tasks[task_id] = { ...latestSong, status: finalAudioUrl ? "completed" : "processing" };
    }

    return res.status(200).json({
      success: true,
      task_id: task_id || "task_active",
      styleTagsUsed: strictStyleTags,
      data: latestSong
    });

  } catch (error) {
    console.error("[ERROR] Endpoint failure:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Incoming Callback / Webhook updates from Music API
app.post('/callback', (req, res) => {
  const { task_id, audio_url, status } = req.body;
  
  if (audio_url) {
    latestSong.audio_url = audio_url;
    if (task_id && tasks[task_id]) {
      tasks[task_id].audio_url = audio_url;
      tasks[task_id].status = status || "completed";
    }
    console.log(`[LOG] Audio URL updated for task ${task_id}: ${audio_url}`);
  }
  
  res.status(200).json({ received: true });
});

// Preview endpoint polled by songsfromyourheart.com/preview-results
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
