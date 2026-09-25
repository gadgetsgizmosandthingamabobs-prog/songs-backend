import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

app.use(cors());
app.use(express.json());

// In-memory session store
const activeSessions = new Map();

// MusicAPI Configuration
const MUSIC_API_URL = "https://api.musicapi.ai/api/v1/sonic/create";
const MUSIC_STATUS_URL = "https://api.musicapi.ai/api/v1/sonic/task/";
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

// 1. Intake Endpoint
app.post('/api/song/create', async (req, res) => {
    try {
        const { token, recipient, name, occasion, genre, memories } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        console.log(`[SONG START] Token: ${token} | Name: ${name} | Genre: ${genre}`);

        const musicPayload = {
            task_type: "create_music",
            custom_mode: false,
            mv: "sonic-v5",
            title: `${name}'s ${occasion || 'Special'} Song`,
            tags: genre || "Pop, melodic",
            gpt_description_prompt: `A custom song for ${recipient || 'someone special'} named ${name}. Occasion: ${occasion}. Memories/Details: ${memories}`
        };

        const mResponse = await fetch(MUSIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify(musicPayload)
        });

        const mData = await mResponse.json();
        const taskId = mData.task_id || mData.id || mData.data?.task_id;

        if (!taskId) {
            console.error("MusicAPI Error Response:", mData);
            return res.status(500).json({ error: 'Failed to initiate generation with MusicAPI', details: mData });
        }

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

// 2. Polling Endpoint
app.get('/api/check-status', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token || !activeSessions.has(token)) {
            return res.json({ status: 'processing' });
        }

        const session = activeSessions.get(token);

        if (session.status === 'completed') {
            return res.json({
                status: 'completed',
                audioUrl: session.audioUrl,
                details: session.details
            });
        }

        const statusRes = await fetch(`${MUSIC_STATUS_URL}${session.taskId}`, {
            headers: {
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            }
        });

        const statusData = await statusRes.json();
        const taskState = statusData.status || statusData.data?.status;
        const audioUrl = statusData.audio_url || statusData.audioUrl || statusData.data?.audio_url;

        if (taskState === 'succeeded' || taskState === 'completed' || audioUrl) {
            session.status = 'completed';
            session.audioUrl = audioUrl;
            activeSessions.set(token, session);

            return res.json({
                status: 'completed',
                audioUrl: session.audioUrl,
                details: session.details
            });
        } else if (taskState === 'failed') {
            session.status = 'failed';
            return res.json({ status: 'failed', error: 'Generation failed upstream' });
        }

        return res.json({ status: 'processing' });

    } catch (err) {
        console.error("Error checking MusicAPI status:", err);
        return res.json({ status: 'processing' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
