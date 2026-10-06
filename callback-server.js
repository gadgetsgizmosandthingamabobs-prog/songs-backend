const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Ensure node-fetch is installed or use native fetch in newer Node environments

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Main song generation endpoint
app.post('/api/generate-song', async (req, res) => {
  try {
    const { name, occasion, genre, voice, memories } = req.body;

    // Validate incoming fields
    if (!name || !occasion || !genre || !voice || !memories) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required form fields.' 
      });
    }

    // Build description prompt incorporating genre specifics (including Love Ballads)
    let genreStyleInstruction = genre;
    if (genre === 'Love Ballads') {
      genreStyleInstruction = 'Romantic Love Ballad, emotional heartfelt vocals, soaring melodic chorus, lush acoustic and orchestral arrangement';
    }

    const gptDescriptionPrompt = `Create a custom song for ${name}. Occasion: ${occasion}. Musical Style/Genre: ${genreStyleInstruction}. Specific memories and details to include: ${memories}.`;

    const tags = `${genre}, ${occasion}, custom song, emotional`;
    const title = `Song for ${name} - ${occasion}`;

    // Construct payload required for MusicAPI endpoint
    const musicApiPayload = {
      gpt_description_prompt: gptDescriptionPrompt,
      tags: tags,
      title: title,
      mv: 'sonic-v3-5',
      voice: voice
    };

    // Call MusicAPI endpoint
    const musicApiResponse = await fetch('https://api.musicapi.ai/api/v1/sonic/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_MUSIC_API_KEY' // Un-comment and add your API key header if required by your setup
      },
      body: JSON.stringify(musicApiPayload)
    });

    const musicApiData = await musicApiResponse.json();

    if (!musicApiResponse.ok) {
      throw new Error(musicApiData.message || 'MusicAPI service rejected the generation request.');
    }

    // Return success response back to frontend
    return res.status(200).json({
      success: true,
      message: 'Song generation task successfully initiated.',
      data: musicApiData
    });

  } catch (err) {
    console.error('Error in /api/generate-song:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Internal server error while communicating with MusicAPI.' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server is running and listening on port ${PORT}`);
});
