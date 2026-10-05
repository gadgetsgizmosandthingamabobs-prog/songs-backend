const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main song generation endpoint
app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories, email } = req.body;

        if (!name || !occasion || !genre || !memories) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        // Example integration call to MusicAPI (replace with your active API key / payload structure)
        const musicApiResponse = await axios.post('https://api.musicapi.ai/v1/sonic/create', {
            prompt: `${genre} song for ${name}, occasion: ${occasion}. Details: ${memories}`,
            tags: `${genre}, ${occasion}`,
            title: `Song for ${name}`
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.MUSICAPI_API_KEY}` // Ensure your env variable is set in Railway
            }
        });

        // Generate a preview token or pass back task info
        const token = musicApiResponse.data.taskId || 'sample_token_' + Date.now();

        return res.json({ 
            success: true, 
            token: token 
        });

    } catch (err) {
        console.error('Generation error:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.response?.data?.message || err.message 
        });
    }
});

app.listen(PORT, function() {
    console.log('Server is running on port ' + PORT);
});
