const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route to verify server is live
app.get('/', (req, res) => {
    res.send('Songs From Your Heart Backend is running!');
});

// Primary song generation endpoint (/api/generate-song)
app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories, email } = req.body;

        if (!name || !occasion || !genre || !memories) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        // Call MusicAPI
        const musicApiResponse = await axios.post('https://api.musicapi.ai/v1/sonic/create', {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.MUSICAPI_API_KEY}`
            }
        });

        const token = musicApiResponse.data.taskId || 'sample_token_' + Date.now();

        return res.json({ 
            success: true, 
            token: token 
        });
