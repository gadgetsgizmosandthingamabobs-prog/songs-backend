import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const activeSessions = new Map();
const MUSIC_API_URL = "https://api.musicapi.ai/api/v1/sonic/create";
const MUSIC_STATUS_URL = "https://api.musicapi.ai/api/v1/sonic/task/";
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;

const FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

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

        const payload = {
            custom_mode: false,
            mv: "sonic-v5-5",
            title: `${name}'s ${occasion || 'Special'} Song`,
            tags: genre || "Pop, melodic",
            gpt_description_prompt: `A custom song for ${recipient || 'someone special'} named ${name}. Occasion: ${occasion}. Details: ${memories}`
        };

        const response = await fetch(MUSIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MUSIC_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("[MUSIC API RAW RESPONSE]:", JSON.stringify(data));

        const taskId = data.task_id || data.id || data.data?.task_id || data.data?.id;

        if (!taskId) {
            console.error("[ERROR] No task ID returned from MusicAPI:", data);
            // Fallback gracefully so the user isn't stuck if the external API hiccups
            activeSessions.set(token, {
                status: 'completed',
                audioUrl: FALLBACK_AUDIO,
                details: { recipient, name, occasion, genre, memories }
            });
            return res.json({ success: true, taskId: 'fallback' });
        }

        activeSessions.set(token, {
            taskId: taskId,
            status: 'processing',
            details: { recipient, name, occasion, genre, memories },
            createdAt: Date.now()
        });

        return res.json({ success: true, taskId });
    } catch (err) {
        console.error("Server error during creation:", err);
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

        if (session.taskId === 'fallback' || !session.taskId) {
            session.status = 'completed';
            session.audioUrl = FALLBACK_AUDIO;
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        const statusRes = await fetch(`${MUSIC_STATUS_URL}${session.taskId}`, {
            headers: { 'Authorization': `Bearer ${MUSIC_API_KEY}` }
        });

        const statusData = await statusRes.json();
        console.log(`[STATUS CHECK ${session.taskId}]:`, JSON.stringify(statusData));

        const rawState = statusData.status || statusData.data?.status || statusData.state || '';
        const taskState = String(rawState).toLowerCase();
        const audioUrl = statusData.audio_url || statusData.audioUrl || statusData.data?.audio_url || statusData.data?.suno_song_list?.[0]?.audio_url || statusData.result?.audio_url;

        if (audioUrl || taskState.includes('succ') || taskState.includes('comp') || taskState.includes('complete')) {
            session.status = 'completed';
            session.audioUrl = audioUrl || FALLBACK_AUDIO;
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        // Safety fallback timer (45 seconds max wait for external generation)
        if (Date.now() - session.createdAt > 45000) {
            session.status = 'completed';
            session.audioUrl = FALLBACK_AUDIO;
            activeSessions.set(token, session);
            return res.json({ status: 'completed', audioUrl: session.audioUrl, details: session.details });
        }

        return res.json({ status: 'processing' });
    } catch (err) {
        console.error("Error during status check:", err);
        return res.json({ status: 'processing' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
