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

  const timestampSeconds = Number(timestamp);
  const currentSeconds = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(currentSeconds - timestampSeconds) > 300
  ) {
    return false;
  }

  const signedMessage = `${timestamp}.${rawBody}`;

  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", CALLBACK_SECRET)
      .update(signedMessage)
      .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(receivedSignature, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

function normalizeCallback(payload) {
  const songData = Array.isArray(payload.data)
    ? payload.data[0] || {}
    : payload.data || {};

  const isFailed =
    payload.event === "song.failed" ||
    payload.type === "failed" ||
    songData.state === "failed";

  return {
    task_id: payload.task_id || null,
    platform: payload.platform || "producer",
    event: payload.event || null,
    status: isFailed ? "failed" : "completed",

    title: songData.title || null,
    mp3_url: songData.audio_url || songData.mp3_url || null,
    wav_url: songData.wav_url || null,
    lyrics: songData.lyrics || null,
    lyrics_id: songData.lyrics_id || null,

    error_message: isFailed
      ? payload.message || songData.message || "Song generation failed"
      : null,

    received_at: new Date().toISOString()
  };
}

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post(
  "/api/music-callback",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const rawBody = req.body.toString("utf8");

      const timestamp = req.get("X-Webhook-Timestamp");
      const signature = req.get("X-Webhook-Signature");

      const eventId =
        req.get("X-Webhook-Id") ||
        req.get("Idempotency-Key") ||
        crypto.createHash("sha256").update(rawBody).digest("hex");

      const valid = verifySignature(
        rawBody,
        timestamp,
        signature
      );

      if (!valid) {
        return res.status(401).json({
          error: "Invalid callback signature"
        });
      }

      const payload = JSON.parse(rawBody);
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

      if (processedEvents.has(eventId) || songs.has(taskId)) {
        return res.status(200).json({
          received: true,
          duplicate: true,
          task_id: taskId
        });
      }

      const song = normalizeCallback(payload);

      songs.set(taskId, song);
      processedEvents.add(eventId);

      console.log("Saved MusicAPI callback:", song);

      return res.status(200).json({
        received: true,
        task_id: taskId,
        status: song.status
      });
    } catch (error) {
      console.error("Callback error:", error);

      return res.status(400).json({
        error: "Invalid callback payload"
      });
    }
  }
);

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
