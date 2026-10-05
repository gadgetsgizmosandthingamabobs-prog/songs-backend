const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-memory session store (token -> { status, audioUrl, taskId })
const sessionStore = new Map();

const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

// 1. Trigger Song Generation
app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories, email } = req.body;
        const token = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Construct lyrics prompt or custom lyrics optimized for full-length tracks (at least 2:30+)
        const promptText = `A full-length ${genre} song dedicated to ${name} for their ${occasion}. Memories include: ${memories}. High energy, emotional depth, structured with multiple verses, chorus, bridge, guitar solo, and extended outro to ensure total duration exceeds 2 minutes and 30 seconds.`;

        // Payload configured for full-length generation via MusicAPI
        const payload = {
            task_type: 'create_music',
            mv: 'sonic-v5',
            custom_mode: true,
            instrumental: false,
            prompt: promptText,
            title: `${name}'s ${occasion}`,
            tags: genre,
            duration: 180 
        };

        const response = await axios.post('https://api.musicapi.ai/v1/sonic/create', payload, {
            headers: {
                'Authorization': `Bearer ${MUSIC_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const taskId = response.data.task_id || response.data.id;
        
        if (!taskId) {
            throw new Error("Failed to obtain task ID from MusicAPI.");
        }

        sessionStore.set(token, {
            status: 'processing',
            taskId: taskId,
            audioUrl: null,
            metadata: { name, occasion, genre, email }
        });

        // Start background polling
        pollMusicApi(token, taskId);

        res.json({ success: true, token: token });
    } catch (error) {
        console.error('Generation error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to trigger song generation.' });
    }
});

// 2. Background Polling Function
async function pollMusicApi(token, taskId) {
    const maxAttempts = 40;
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await axios.get(`https://api.musicapi.ai/v1/sonic/task/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${MUSIC_API_KEY}`
                }
            });

            const data = response.data;
            const taskStatus = data.status || data.state;

            if (taskStatus === 'completed' || taskStatus === 'success') {
                clearInterval(interval);
                const audioUrl = data.audio_url || data.output?.audio_url || data.url;
                sessionStore.set(token, {
                    ...sessionStore.get(token),
                    status: 'completed',
                    audioUrl: audioUrl
                });
            } else if (taskStatus === 'failed' || attempts >= maxAttempts) {
                clearInterval(interval);
                sessionStore.set(token, {
                    ...sessionStore.get(token),
                    status: 'failed'
                });
            }
        } catch (err) {
            console.error('Polling error:', err.message);
        }
    }, 10000);
}

// 3. Status Endpoint for Frontend
app.get('/api/song-status', (req, res) => {
    const { token } = req.query;
    if (!token || !sessionStore.has(token)) {
        return res.status(404).json({ error: 'Invalid or expired session token.' });
    }

    const session = sessionStore.get(token);
    res.json(session);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
