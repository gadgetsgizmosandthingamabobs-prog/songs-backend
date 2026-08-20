import fetch from "node-fetch";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Store recent completed songs in memory by taskId
let completedSongs = new Map();
let latestSong = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Trigger generation (called by generator page)
app.post('/api/generate', async (req, res) => {
    try {
        const payload = req.body;
        const taskId = payload.task_id || ('task_' + Date.now());

        // Forward payload to Make.com webhook asynchronously
        fetch('https://hook.us2.make.com/7ijspklghp74sye2tcj3xyj0lheewi5d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, task_id: taskId })
        }).catch(err => console.log("Make forward error:", err));

        res.status(200).json({ success: true, task_id: taskId });
    } catch (error) {
        console.error('Error forwarding generation:', error);
        res.status(500).json({ error: 'Failed to process generation request' });
    }
});

// 2. Receive completed song callback from Make.com / MusicAPI
app.post("/api/music-callback", async (req, res) => {
    try {
        const payload = req.body;
        const taskId = payload.task_id;
        
        if (taskId) {
            completedSongs.set(taskId, payload);
            latestSong = payload;
        }
        
        console.log("Received completion callback for task:", taskId);
        res.status(200).json({ received: true });
    } catch (e) {
        res.status(400).json({ error: "Invalid callback payload" });
    }
});

// 3. Endpoint for preview page to fetch song details by taskId
app.get("/api/song/:taskId", (req, res) => {
    const taskId = req.params.taskId;
    const song = completedSongs.get(taskId) || (taskId === 'latest' ? latestSong : null);
    
    if (!song) {
        return res.status(404).json({ error: "Song still processing" });
    }
    res.status(200).json(song);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
