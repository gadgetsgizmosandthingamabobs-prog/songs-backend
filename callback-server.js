const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const activeSessions = new Map();

app.post('/api/generate-song', async (req, res) => {
    try {
        const { name, occasion, genre, memories } = req.body;
        
        if (!name || !occasion) {
            return res.status(400).json({ error: "Missing required fields (name or occasion)." });
        }

        const token = "token_" + Date.now();
        const taskId = "task_" + Date.now();

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

app.post('/api/music-callback', (req, res) => {
    try {
        const timestamp = req.header("x-webhook-timestamp") || "";
        const signature = req.header("x-webhook-signature") || "";
        const data = req.body;
        
        res.json({ received: true });
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
