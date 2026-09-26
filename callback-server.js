import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const WORKABLE_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

app.post('/api/song/create', async (req, res) => {
    const { token, name, genre } = req.body;
    console.log(`[CREATE] Token: ${token} | Name: ${name} | Genre: ${genre}`);
    return res.json({ success: true, status: 'processing' });
});

app.get('/api/check-status', async (req, res) => {
    const token = req.query.token;
    console.log(`[CHECK] Token: ${token}`);
    return res.json({ 
        status: 'completed', 
        audioUrl: WORKABLE_AUDIO 
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
