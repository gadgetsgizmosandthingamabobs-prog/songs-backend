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

        // Exact MusicAPI payload contract format
        const payload = {
            gpt_description_prompt: `${genre} song for ${name}, celebrating ${occasion}. Details: ${memories}`.substring(0, 195),
            tags: `${genre}, ${occasion}`.substring(0, 195),
            title: `Song for ${name}`.substring(0, 75),
            mv: 'sonic-v3-5'
        };

        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const token = (musicApiResponse.data && (musicApiResponse.data.taskId || musicApiResponse.data.task_id)) || ('sample_token_' + Date.now());

        return res.json({ success: true, token: token });

    } catch (err) {
        console.error('Generation error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Internal Server Error';
        return res.status(500).json({ 
            success: false, 
            error: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg
        });
    }
});

// Fallback route without /api prefix
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

        const payload = {
            gpt_description_prompt: `${genre} song for ${name}, celebrating ${occasion}. Details: ${memories}`.substring(0, 195),
            tags: `${genre}, ${occasion}`.substring(0, 195),
            title: `Song for ${name}`.substring(0, 75),
            mv: 'sonic-v3-5'
        };

        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const token = (musicApiResponse.data && (musicApiResponse.data.taskId || musicApiResponse.data.task_id)) || ('sample_token_' + Date.now());

        return res.json({ success: true, token: token });

    } catch (err) {
        console.error('Generation error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Internal Server Error';
        return res.status(500).json({ 
            success: false, 
            error: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg
        });
    }
});

app.listen(PORT, function() {
    console.log('Server is running smoothly on port ' + PORT);
});
