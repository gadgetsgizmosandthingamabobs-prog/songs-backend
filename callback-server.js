import fetch from "node-fetch";
import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 3000;
const CALLBACK_SECRET = process.env.MUSIC_CALLBACK_SECRET;

if (!CALLBACK_SECRET) {
    throw new Error("Missing MUSIC_CALLBACK_SECRET");
}

const songs = new Map();
const processedEvents = new Set();

function verifySignature(rawBody, timestamp, receivedSignature) {
    if (!timestamp || !receivedSignature) {
        return false;
    }
    const hmac = crypto.createHmac("sha256", CALLBACK_SECRET);
    hmac.update(`${timestamp}.${rawBody}`);
    const computedSignature = hmac.digest("hex");
    return computedSignature === receivedSignature;
}

app.use(express.text({ type: "*/*" }));

// Endpoint to receive generation requests from your website and call MusicAPI
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, genre, title } = JSON.parse(req.body);

        const musicApiResponse = await fetch('https://api.musicapi.ai/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MUSIC_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                tags: genre,
                title: title,
                callback_url: 'https://songs-backend-kbfk.onrender.com/api/music-callback'
            })
        });

        const data = await musicApiResponse.json();
        
        if (!musicApiResponse.ok) {
            return res.status(musicApiResponse.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error generating song:', error);
        res.status(500).json({ error: 'Failed to trigger song generation' });
    }
});

app.post("/api/music-callback", async (req, res) => {
    const rawBody = req.body;
    const timestamp = req.headers["x-musicapi-timestamp"];
    const receivedSignature = req.headers["x-musicapi-signature"];

    if (!verifySignature(rawBody, timestamp, receivedSignature)) {
        return res.status(401).json({
            error: "Invalid callback signature"
        });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        return res.status(400).json({
            error: "Invalid JSON payload"
        });
    }

    const taskId = payload.task_id;
    
    // Forward payload to Make.com webhook
    try {
        await fetch('https://hook.us2.make.com/uq64mkqbta2m2h9hph4obhg7o4b5adhy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: rawBody
        });
    } catch (forwardError) {
        console.error('Failed to forward to Make.com:', forwardError);
    }

    if (!taskId) {
        return res.status(400).json({
            error: "Missing task_id"
        });
    }

    songs.set(taskId, payload);
    console.log("Saved MusicAPI callback for task:", taskId);

    return res.status(200).json({
        received: true,
        task_id: taskId
    });
});

app.get("/api/song/:taskId", (req, res) => {
    const song = songs.get(req.params.taskId);

    if (!song) {
        return res.status(404).json({
            error: "Song not found",
            task_id: req.params.taskId
        });
    }

    res.status(200).json(song);
});

app.listen(PORT, () => {
    console.log(`Callback server listening on port ${PORT}`);
});
