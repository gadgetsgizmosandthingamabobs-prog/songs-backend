const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Active sessions storage
const activeSessions = new Map();

// Generate Song Route matching your form parameters
app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories } = req.body;
        
        if (!name || !occasion) {
            return res.status(400).json({ error: "Missing required fields (name or occasion)." });
        }

        const token = "token_" + Date.now();
        const taskId = "task_" + Date.now();

        // Store session details
        activeSessions.set(token, {
            taskId: taskId,
            status: 'processing',
            details: { name, occasion, genre, memories }
        });

        activeSessions.set(taskId, {
            token: token,
            status: 'processing',
            details: { name, occasion, genre, memories }
        });

        return res.json({ success: true, token: token, taskId: taskId });
    } catch (err) {
        console.error("Server error during creation:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Webhook endpoint for MusicAPI results
app.post('/api/music-callback', (req, res) => {
    try {
        const timestamp = req.header("x-webhook-timestamp") || "";
        const signature = req.header("x-webhook-signature") || "";
        
        // Process incoming callback data here
        const data = req.body;
        
        res.json({ received: true });
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
