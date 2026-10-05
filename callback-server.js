const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', function(req, res) {
    res.send('Songs From Your Heart Backend is running and online!');
});

// Primary song generation endpoint
app.post('/api/generate-song', async function(req, res) {
    try {
        const { name, occasion, genre, memories } = req.body || {};

        if (!name || !occasion || !genre || !memories) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        const apiKey = process.env.MUSIC_API_KEY || process.env.MUSICAPI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'Server API key not configured.' });
        }

        // Corrected MusicAPI endpoint with /api included
        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
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

// Fallback route without /api prefix for the backend itself
app.post('/generate-song', async function(req, res) {
    try {
        const { name, occasion, genre, memories } = req.body || {};

        if (!name || !occasion || !genre || !memories) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        const apiKey = process.env.MUSIC_API_KEY || process.env.MUSICAPI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'Server API key not configured.' });
        }

        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
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
