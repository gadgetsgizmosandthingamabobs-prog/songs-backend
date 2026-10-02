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
            console.error("CRITICAL: MUSIC_API_KEY is missing in environment variables.");
            return res.status(500).json({ error: "Server configuration error: Missing MUSIC_API_KEY." });
        }

        const songPrompt = `[Verse]\nThis song is dedicated to ${name} for ${occasion}.\nMemories: ${memories || 'A heartfelt personal tribute.'}\n\n[Chorus]\nCelebrating ${name}, our special bond today.`;

        console.log(`Sending song generation request to MusicAPI for ${name} (${occasion})...`);

        const apiResponse = await fetch('https://api.musicapi.ai/api/v1/sonic/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify({
                task_type: 'create_music',
                custom_mode: true,
                mv: 'sonic-v5',
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
            console.error("MusicAPI non-JSON response:", textResponse);
            throw new Error("MusicAPI returned an invalid response format.");
        }

        if (!apiResponse.ok) {
            console.error("MusicAPI error response:", data);
            throw new Error(data.message || data.error || `MusicAPI error (Status ${apiResponse.status})`);
        }

        // Extract task ID securely from response formats
        const rawTaskId = data.task_id || data.id || (data.data && (data.data.task_id || data.data[0]?.task_id));
        if (!rawTaskId) {
            console.error("Missing task ID in MusicAPI response:", data);
            throw new Error("MusicAPI did not return a valid task ID.");
        }

        const taskId = String(rawTaskId).replace(/[\/\\]/g, '-');

        activeJobs.set(taskId, {
            status: 'processing',
            createdAt: Date.now(),
            audioUrl: null,
            metadata: { name, occasion, genre, memories }
        });

        console.log(`Generation successfully queued. Task ID/Token: ${taskId}`);
        return res.json({ token: taskId, status: 'processing' });
    } catch (err) {
        console.error('Generation Endpoint Error:', err);
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

        // Parse task object according to MusicAPI documentation structure
        const taskObj = Array.isArray(data.data) ? data.data[0] : (data.data || data);
        const taskState = taskObj.status || taskObj.state || data.status || data.state;
        const audioUrl = taskObj.audio_url || taskObj.url || data.audio_url || data.url || (data.clips && data.clips[0]?.audio_url);

        console.log(`Polling task ${token} -> State: ${taskState || 'unknown'}, Audio URL found: ${!!audioUrl}`);

        if (taskState === 'succeeded' || taskState === 'completed' || audioUrl) {
            job.status = 'completed';
            job.audioUrl = audioUrl;
            activeJobs.set(token, job);
            console.log(`Song generation completed for token: ${token}`);
            return res.json({ status: 'completed', audioUrl: job.audioUrl });
        } else if (taskState === 'failed' || taskState === 'error') {
            job.status = 'failed';
            activeJobs.set(token, job);
            console.error(`Song generation failed for token ${token}`);
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
