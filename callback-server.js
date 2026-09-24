import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

app.use(cors());
app.use(express.json());

// In-memory store mapping your frontend tokens to MusicAPI task IDs and states
const activeSessions = new Map();

// MusicAPI Configuration
const MUSIC_API_URL = "https://api.musicapi.ai/api/v1/sonic/create";
const MUSIC_STATUS_URL = "https://api.musicapi.ai/api/v1/sonic/task/";
const MUSIC_API_KEY = process.env.MUSIC_API_KEY; // Set this in your Railway environment variables

// 1. Intake Endpoint (Called when user clicks submit in Systeme.io)
app.post('/api/song/create', async (req, res) => {
    try {
        const { token, recipient, name, occasion, genre, memories } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        console.log(`[SONG START] Token: ${token} | Name: ${name} | Genre: ${genre}`);

        // Construct prompt/payload for MusicAPI (using custom mode or text description)
        const musicPayload = {
            custom_mode: false,
            mv: "sonic-v4-5",
            title: `${name}'s ${occasion || 'Special'} Song`,
            tags: genre || "Pop, melodic",
            gpt_description_prompt: `A custom song for ${recipient || 'someone special'} named ${name}. Occasion: ${occasion}. Memories/Details: ${memories}`
        };

        // Call MusicAPI to start generation
        const mResponse = await fetch(MUSIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify(musicPayload)
        });

        const mData = await mResponse.json();

        // MusicAPI typically returns a task_id or id to poll
        const taskId = mData.task_id || mData.id;

        if (!taskId) {
            console.error("MusicAPI Error Response:", mData);
            return res.status(500).json({ error: 'Failed to initiate generation with MusicAPI' });
        }

        // Store session mapping
        activeSessions.set(token, {
            taskId: taskId,
            status: 'processing',
            details: { recipient, name, occasion, genre, memories }
        });

        return res.json({ success: true, message: 'Generation initiated with MusicAPI' });

    } catch (err) {
        console.error("Server error during song creation:", err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Polling Endpoint (Called continuously by the preview page)
app.get('/api/check-status', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token || !activeSessions.has(token)) {
            return res.json({ status: 'processing' });
        }

        const session = activeSessions.get(token);

        // If we already marked it completed locally, return it
        if (session.status === 'completed') {
            return res.json({
                status: 'completed',
                audioUrl: session.audioUrl,
                details: session.details
            });
        }

        // Check status from MusicAPI using the taskId
        const statusRes = await fetch(`${MUSIC_STATUS_URL}${session.taskId}`, {
            headers: {
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            }
        });

        const statusData = await statusRes.json();
        console.log('[POLL RESPONSE]:', JSON.stringify(statusData)); // Added debug logging

        // Check if MusicAPI has finished (MusicAPI uses 'succeeded' or 'completed')
        if (statusData.status === 'succeeded' || statusData.status === 'completed' || statusData.audio_url) {
            session.status = 'completed';
            session.audioUrl = statusData.audio_url || statusData.audioUrl;
            activeSessions.set(token, session);

            return res.json({
                status: 'completed',
                audioUrl: session.audioUrl,
                details: session.details
            });
        } else if (statusData.status === 'failed') {
            session.status = 'failed';
            return res.json({ status: 'failed' });
        }

        return res.json({ status: 'processing' });

    } catch (err) {
        console.error("Error checking MusicAPI status:", err);
        return res.json({ status: 'processing' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
