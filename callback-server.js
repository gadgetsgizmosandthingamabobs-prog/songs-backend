const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

// In-memory job tracker
const activeJobs = new Map();

// 1. Generate Song Endpoint
app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories } = req.body;

        if (!name || !occasion) {
            return res.status(400).json({ error: "Missing required fields (name or occasion)." });
        }

        if (!MUSIC_API_KEY) {
            return res.status(500).json({ error: "Server configuration error: Missing MUSIC_API_KEY." });
        }

        const songPrompt = `[Verse]\nThis song is dedicated to ${name} for ${occasion}.\nMemories: ${memories || 'A heartfelt personal tribute.'}\n\n[Chorus]\nCelebrating ${name}, our special bond today.`;

        const apiResponse = await fetch('https://api.musicapi.ai/api/v1/sonic/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify({
                custom_mode: true,
                mv: 'sonic-v4-5',
                title: `${name}'s ${occasion}`,
                tags: `${genre || 'Pop'}, emotional, professional`,
                prompt: songPrompt
            })
        });

        const textResponse = await apiResponse.text();
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            throw new Error("MusicAPI returned non-JSON response.");
        }

        if (!apiResponse.ok) {
            throw new Error(data.message || data.error || `MusicAPI error (Status ${apiResponse.status})`);
        }

        // Extract task ID securely
        const rawTaskId = data.task_id || data.id || (data.data && (data.data.task_id || data.data[0]?.task_id));
        if (!rawTaskId) {
            throw new Error("MusicAPI did not return a valid task ID.");
        }

        // Sanitize slashes to prevent query parsing bugs
        const taskId = String(rawTaskId).replace(/[\/\\]/g, '-');

        activeJobs.set(taskId, {
            status: 'processing',
            createdAt: Date.now(),
            audioUrl: null,
            metadata: { name, occasion, genre, memories }
        });

        console.log(`Generation started. Token: ${taskId}`);
        return res.json({ token: taskId, status: 'processing' });
    } catch (err) {
        console.error('Generation Error:', err);
        return res.status(500).json({ error: err.message || 'Internal server generation failure.' });
    }
});

// 2. Song Status Polling Endpoint
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
        const response = await fetch(`https://api.musicapi.ai/api/v1/sonic/task/${token}`, {
            headers: { 'Authorization': `Bearer ${MUSIC_API_KEY}` }
        });
        
        const textResp = await response.text();
        let data;
        try {
            data = JSON.parse(textResp);
        } catch (e) {
            return res.json({ status: 'processing' });
        }

        const taskState = data.status || data.state || (data.data && (data.data.status || data.data.state || data.data[0]?.state));
        const audioUrl = data.audio_url || data.url || 
                         (data.data && (data.data.audio_url || data.data.url || data.data[0]?.audio_url || data.data[0]?.url)) ||
                         (data.clips && data.clips[0]?.audio_url);

        if (taskState === 'succeeded' || taskState === 'completed' || audioUrl) {
            job.status = 'completed';
            job.audioUrl = audioUrl || (data.data && data.data[0]?.audio_url);
            activeJobs.set(token, job);
            console.log(`Song completed successfully for token: ${token}`);
            return res.json({ status: 'completed', audioUrl: job.audioUrl });
        } else if (taskState === 'failed') {
            job.status = 'failed';
            activeJobs.set(token, job);
            return res.json({ status: 'failed', error: 'Music generation failed from provider.' });
        }

        return res.json({ status: 'processing' });
    } catch (err) {
        console.error('Polling Error:', err);
        return res.json({ status: 'processing' });
    }
});

app.listen(PORT, () => {
    console.log(`Production server running on port ${PORT}`);
});
