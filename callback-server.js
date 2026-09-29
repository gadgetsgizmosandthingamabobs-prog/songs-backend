const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

// Store active generation jobs in memory
const activeJobs = new Map();

app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories } = req.body;

        if (!name || !occasion) {
            return res.status(400).json({ error: "Missing required fields (name or occasion)." });
        }

        if (!MUSIC_API_KEY) {
            return res.status(500).json({ error: "Server configuration error: Missing MUSIC_API_KEY." });
        }

        const songPrompt = `A high-quality ${genre || 'Pop'} song for ${name}, celebrating ${occasion}. Details: ${memories || 'A heartfelt personal tribute.'}`;

        const response = await fetch('https://api.musicapi.ai/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify({
                prompt: songPrompt,
                tags: `${genre || 'Pop'}, emotional, professional`,
                mv: 'chirp-v3-5',
                title: `${name}'s ${occasion}`
            })
        });

        const data = await response.json();

        if (!response.ok || (!data.task_id && !data.id)) {
            throw new Error(data.message || 'Failed to initialize generation with music provider.');
        }

        const taskId = data.task_id || data.id;

        activeJobs.set(taskId, {
            status: 'processing',
            createdAt: Date.now(),
            audioUrl: null,
            metadata: { name, occasion, genre, memories }
        });

        return res.json({ token: taskId, status: 'processing' });

    } catch (err) {
        console.error('Generation Error:', err);
        return res.status(500).json({ error: err.message || 'Internal server generation failure.' });
    }
});

app.get('/api/song-status', async (req, res) => {
    const { token } = req.query;
    if (!token || !activeJobs.has(token)) {
        return res.status(404).json({ error: 'Invalid or expired session token.' });
    }

    const job = activeJobs.get(token);
    if (job.status === 'completed') {
        return res.json({ status: 'completed', audioUrl: job.audioUrl });
    }

    try {
        const response = await fetch(`https://api.musicapi.ai/v1/task/${token}`, {
            headers: { 'Authorization': `Bearer ${MUSIC_API_KEY}` }
        });
        const data = await response.json();

        if (data.status === 'completed' || data.audio_url || data.url) {
            job.status = 'completed';
            job.audioUrl = data.audio_url || data.url;
            activeJobs.set(token, job);
            return res.json({ status: 'completed', audioUrl: job.audioUrl });
        } else if (data.status === 'failed') {
            job.status = 'failed';
            activeJobs.set(token, job);
            return res.json({ status: 'failed' });
        }

        return res.json({ status: 'processing' });
    } catch (err) {
        console.error('Status check error:', err);
        return res.json({ status: 'processing' });
    }
});

app.get('/api/stream-audio', (req, res) => {
    const { token } = req.query;
    const job = activeJobs.get(token);
    if (job && job.audioUrl) {
        return res.redirect(job.audioUrl);
    }
    return res.status(404).json({ error: 'Audio stream not ready or invalid token.' });
});

app.listen(PORT, () => {
    console.log(`Production server running on port ${PORT}`);
});
