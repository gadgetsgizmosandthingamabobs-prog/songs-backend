const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route to verify server is live
app.get('/', function(req, res) {
    try {
        res.send('Songs From Your Heart Backend is running!');
    } catch (e) {
        res.status(500).send('Server Error');
    }
});

// Primary song generation endpoint
app.post('/api/generate-song', async function(req, res) {
    try {
        const { name, occasion, genre, memories } = req.body || {};

        if (!name || !occasion || !genre || !memories) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        // Check both versions of the environment variable name to prevent any mismatch
        const apiKey = process.env.MUSIC_API_KEY || process.env.MUSICAPI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'Server API key not configured.' });
        }

        // Call MusicAPI safely
        const musicApiResponse = await axios.post('https://api.musicapi.ai/v1/sonic/create', {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const token = (musicApiResponse.data && musicApiResponse.data.taskId) || ('sample_token_' + Date.now());

        return res.json({ success: true, token: token });

    } catch (err) {
        console.error('Generation error:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.response?.data?.message || err.message || 'Internal Server Error'
        });
    }
});

app.listen(PORT, function() {
    console.log('Server is running smoothly on port ' + PORT);
});
