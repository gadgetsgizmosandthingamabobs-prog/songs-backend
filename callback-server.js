import fetch from "node-fetch";
import express from "express";
import crypto from "node:crypto";
import cors from "cors";

const app = express();
app.use(cors()); // Allows your website to talk to this backend

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

// Endpoint to receive generation requests from your website and forward to Make.com
app.post('/api/generate', async (req, res) => {
    try {
        const payload = JSON.parse(req.body);

        // Forward the generation request straight to your Make.com scenario webhook
        const makeResponse = await fetch('https://hook.us2.make.com/7ijspklghp74sye2tcj3xyj0lheewi5d', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!makeResponse.ok) {
            return res.status(500).json({ error: 'Failed to trigger Make.com scenario' });
        }

        res.status(200).json({ success: true, message: 'Generation triggered successfully' });
    } catch (error) {
        console.error('Error forwarding generation:', error);
        res.status(500).json({ error: 'Failed to process generation request' });
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
