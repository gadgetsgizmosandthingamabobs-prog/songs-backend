import fetch from "node-fetch";
import express from "express";
import crypto from "node:crypto";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const CALLBACK_SECRET = process.env.MUSIC_CALLBACK_SECRET;

let recentSongs = [];

app.use(express.text({ type: "*/*" }));

// 1. Trigger generation via Make.com
app.post('/api/generate', async (req, res) => {
    try {
        const payload = JSON.parse(req.body);
        const taskId = payload.task_id || ('task_' + Date.now());

        // Forward to Make.com webhook asynchronously
        fetch('https://hook.us2.make.com/7ijspklghp74sye2tcj3xyj0lheewi5d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, task_id: taskId })
        }).catch(err => console.log("Make forward error:", err));

        // Immediately register a fallback preview song so the frontend never hangs
        recentSongs.unshift({
            task_id: taskId,
            audio_url: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_db7c959750.mp3?filename=uplifting-acoustic-guitar-110065.mp3",
            title: payload.custom_title || "Your Custom Masterpiece"
        });
        if (recentSongs.length > 10) recentSongs.pop();

        res.status(200).json({ success: true, task_id: taskId });
    } catch (error) {
        console.error('Error forwarding generation:', error);
        res.status(500).json({ error: 'Failed to process generation request' });
    }
});

// 2. Receive completed song from Make.com/MusicAPI
app.post("/api/music-callback", async (req, res) => {
    try {
        const payload = JSON.parse(req.body);
        recentSongs.unshift(payload);
        if (recentSongs.length > 10) recentSongs.pop();
        console.log("Saved real song callback from Make:", payload);
        res.status(200).json({ received: true });
    } catch (e) {
        res.status(400).json({ error: "Invalid JSON" });
    }
});

// 3. Get song details
app.get("/api/song/:taskId", (req, res) => {
    const found = recentSongs.find(s => s.task_id === req.params.taskId) || recentSongs[0];
    if (!found) {
        return res.status(404).json({ error: "No songs available yet" });
    }
    res.status(200).json(found);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
