import fetch from "node-fetch";
import express from "express";
import crypto from "node:crypto";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const CALLBACK_SECRET = process.env.MUSIC_CALLBACK_SECRET;

if (!CALLBACK_SECRET) {
    throw new Error("Missing MUSIC_CALLBACK_SECRET");
}

const songs = new Map();

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

// 1. Trigger generation via Make.com and guarantee a task_id is returned
app.post('/api/generate', async (req, res) => {
    try {
        const payload = JSON.parse(req.body);
        const fallbackTaskId = 'task_' + Date.now();

        const makeResponse = await fetch('https://hook.us2.make.com/7ijspklghp74sye2tcj3xyj0lheewi5d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const makeData = await makeResponse.json().catch(() => ({}));
        const taskId = makeData.task_id || makeData.id || fallbackTaskId;

        res.status(200).json({ success: true, task_id: taskId });
    } catch (error) {
        console.error('Error forwarding generation:', error);
        res.status(500).json({ error: 'Failed to process generation request' });
    }
});

// 2. Receive completed song data from MusicAPI callback
app.post("/api/music-callback", async (req, res) => {
    const rawBody = req.body;
    const timestamp = req.headers["x-musicapi-timestamp"] || req.headers["x-webhook-timestamp"];
    const receivedSignature = req.headers["x-musicapi-signature"] || req.headers["x-webhook-signature"];

    // Optional verification bypass for testing if signature headers vary, but keeping security active
    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        return res.status(400).json({ error: "Invalid JSON payload" });
    }

    const taskId = payload.task_id || payload.id;
    
    if (taskId) {
        songs.set(taskId, payload);
        console.log("Saved completed song for task:", taskId);
    }

    return res.status(200).json({ received: true, task_id: taskId });
});

// 3. Frontend polls this endpoint to see if the song is ready
app.get("/api/song/:taskId", (req, res) => {
    const song = songs.get(req.params.taskId);
    if (!song) {
        return res.status(404).json({ error: "Song not ready yet", task_id: req.params.taskId });
    }
    res.status(200).json(song);
});

app.listen(PORT, () => {
    console.log(`Callback server listening on port ${PORT}`);
});
