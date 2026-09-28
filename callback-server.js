import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

const app = express();
app.use(cors());

// Capture raw body specifically for webhook HMAC validation
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const activeSessions = new Map();
const MUSIC_API_URL = "https://api.musicapi.ai/api/v1/sonic/create";
const MUSIC_API_KEY = process.env.MUSIC_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-secret-key";

const RAILWAY_PUBLIC_URL = process.env.RAILWAY_STATIC_URL 
  ? `https://${process.env.RAILWAY_STATIC_URL}` 
  : "https://songs-backend-production.up.railway.app"; 

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
            gpt_description_prompt: `A custom song for ${recipient || 'someone special'} named ${name}. Occasion: ${occasion}. Details: ${memories}`,
            webhook_url: `${RAILWAY_PUBLIC_URL}/api/music-callback`,
            webhook_secret: WEBHOOK_SECRET
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
            return res.status(500).json({ error: 'Failed to initialize generation task with MusicAPI' });
        }

        activeSessions.set(taskId, {
            token: token,
            status: 'processing',
            details: { recipient, name, occasion, genre, memories }
        });

        activeSessions.set(token, {
            taskId: taskId,
            status: 'processing',
            details: { recipient, name, occasion, genre, memories }
        });

        return res.json({ success: true, taskId });
    } catch (err) {
        console.error("Server error during creation:", err);
        return res.status(500).json({ error: err.message });
    }
});

// WEBHOOK ENDPOINT: MusicAPI pushes results here automatically
app.post('/api/music-callback', (req, res) => {
    try {
        const timestamp = req.header("x-webhook-timestamp") || "";
        const signature = req.header("x-webhook-signature") || "";

        if (!timestamp || !signature) {
            return res.status(400).send("Missing signature headers");
        }

        // Verify HMAC signature
        const provided = signature.replace(/^sha256=/i, "");
        const expected = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(`${timestamp}.${req.rawBody}`)
            .digest("hex");

        let providedBuf;
        try {
            providedBuf = Buffer.from(provided, "hex");
        } catch (error) {
            return res.status(401).send("Invalid signature encoding");
        }
        const expectedBuf = Buffer.from(expected, "hex");
        
        if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
            return res.status(401).send("Invalid signature");
        }

        // Replay protection (5 minute window)
        const ts = Number(timestamp);
        const age = Math.abs(Date.now() / 1000 - ts);
        if (Number.isNaN(ts) || age > 300) {
            return res.status(401).send("Expired timestamp");
        }

        const eventData = req.body;
        const taskId = eventData.task_id;
        const eventType = eventData.event;

        console.log(`[WEBHOOK RECEIVED] Task: ${taskId} | Event: ${eventType}`);

        let session = activeSessions.get(taskId);
        if (!session && eventData.data?.[0]?.clip_id) {
            for (const [key, val] of activeSessions.entries()) {
                if (val.taskId === taskId) {
                    session = val;
                    break;
                }
            }
        }

        if (session) {
            if (eventType === 'song.completed') {
                const audioUrl = eventData.data?.[0]?.audio_url || eventData.audio_url;
                session.status = 'completed';
                session.audioUrl = audioUrl;
                
                activeSessions.set(taskId, session);
                activeSessions.set(session.token, session);
                console.log(`[SONG READY] Audio URL saved for task ${taskId}: ${audioUrl}`);
            } else if (eventType === 'song.failed') {
                session.status = 'failed';
                activeSessions.set(taskId, session);
                activeSessions.set(session.token, session);
                console.error(`[SONG FAILED] Task ${taskId} failed:`, eventData.message);
            }
        }

        return res.status(200).send("ok");
    } catch (err) {
        console.error("Error processing webhook:", err);
        return res.status(500).send("Server error");
    }
});

// Frontend status polling endpoint returning stored audio URL
app.get('/api/check-status', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }

    let session = activeSessions.get(token);
    if (session && session.taskId) {
        session = activeSessions.get(session.taskId) || session;
    }

    if (!session) {
        return res.json({ status: 'processing' });
    }

    if (session.status === 'completed') {
        return res.json({ 
            status: 'completed', 
            audioUrl: session.audioUrl, 
            details: session.details 
        });
    }

    if (session.status === 'failed') {
        return res.json({ status: 'failed', error: 'Song generation failed.' });
    }

    return res.json({ status: 'processing' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
