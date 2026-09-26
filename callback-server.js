import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const activeSessions = new Map();

const MUSIC_API_URL = "https://api.musicapi.ai/api/v1/sonic/create";
const MUSIC_STATUS_URL = "https://api.musicapi.ai/api/v1/sonic/task/";
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

app.post('/api/song/create', async (req, res) => {
    try {
        const { token, recipient, name, occasion, genre, memories } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        console.log(`[SONG CREATE] Token: ${token} | Name: ${name} | Genre: ${genre}`);

        if (activeSessions.has(token) && activeSessions.get(token).status === 'completed') {
            return res.json({ success: true, status: 'completed' });
        }

        // Official MusicAPI Payload Schema
        const musicPayload = {
            custom_mode: false,
            mv: "sonic-v4-5",
            title: `${name}'s ${occasion || 'Special'} Song`,
            tags: genre || "Pop, melodic",
            gpt_description_prompt: `A custom song for ${recipient || 'someone special'} named ${name}. Occasion: ${occasion}. Memories & details: ${memories}`
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
        console.log("[MUSIC API CREATE RESPONSE]:", JSON.stringify(mData));

        const taskId = mData.task_id || mData.id || mData.data?.task_id || mData.data?.id;

        if (!taskId) {
            console.error("MusicAPI task creation failed:", mData);
            return res.status(500).json({ error: 'Failed to obtain task_id', details: mData });
        }

        activeSessions.set(token, {
            taskId: taskId,
            status: 'processing',
            details: { recipient, name, occasion, genre, memories },
            createdAt: Date.now()
        });

        return res.json({ success: true, taskId });

    } catch (err) {
        console.error("Server error during song creation:", err);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/check-status', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        let session = activeSessions.get(token);

        if (!session) {
            return res.json({ status: 'processing' });
        }

        if (session.status === 'completed') {
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        if (session.status === 'failed') {
            return res.json({ status: 'completed', audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", details: session.details });
        }

        const statusRes = await fetch(`${MUSIC_STATUS_URL}${session.taskId}`, {
            headers: { 'Authorization': `Bearer ${MUSIC_API_KEY}` }
        });

        const statusData = await statusRes.json();
        console.log(`[POLL TASK ${session.taskId}]:`, JSON.stringify(statusData));

        const taskState = statusData.status || statusData.data?.status || statusData.state;
        const audioUrl = statusData.audio_url || statusData.audioUrl || statusData.data?.audio_url || statusData.data?.suno_song_list?.[0]?.audio_url || statusData.result?.audio_url;

        if (taskState === 'succeeded' || taskState === 'completed' || audioUrl) {
            session.status = 'completed';
            session.audioUrl = audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        } else if (taskState === 'failed' || taskState === 'ERROR') {
            session.status = 'completed';
            session.audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        // Safety timeout fallback (3 minutes)
        if (Date.now() - session.createdAt > 180000) {
            session.status = 'completed';
            session.audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        return res.json({ status: 'processing' });

    } catch (err) {
        console.error("Error checking status:", err);
        return res.json({ status: 'processing' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
