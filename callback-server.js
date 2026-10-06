const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', function(req, res) {
    res.send('Songs From Your Heart Backend is running and online!');
});

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

        // Standardized payload structure
        const payload = {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`,
            mv: 'sonic-v3-5'
        };

        console.log('Sending payload to MusicAPI:', payload);

        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const token = (musicApiResponse.data && musicApiResponse.data.taskId) || ('sample_token_' + Date.now());

        return res.json({ success: true, token: token });

    } catch (err) {
        console.error('MusicAPI detailed error response:', err.response?.data);
        const detailedError = err.response?.data?.error || err.response?.data?.message || err.message || 'Internal Server Error';
        return res.status(500).json({ 
            success: false, 
            error: typeof detailedError === 'object' ? JSON.stringify(detailedError) : detailedError
        });
    }
});

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
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`,
            mv: 'sonic-v3-5'
        };

        const musicApiResponse = await axios.post('https://api.musicapi.ai/api/v1/sonic/create', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const token = (musicApiResponse.data && musicApiResponse.data.taskId) || ('sample_token_' + Date.now());

        return res.json({ success: true, token: token });

    } catch (err) {
        console.error('MusicAPI detailed error response:', err.response?.data);
        const detailedError = err.response?.data?.error || err.response?.data?.message || err.message || 'Internal Server Error';
        return res.status(500).json({ 
            success: false, 
            error: typeof detailedError === 'object' ? JSON.stringify(detailedError) : detailedError
        });
    }
});

app.listen(PORT, function() {
    console.log('Server is running smoothly on port ' + PORT);
});
