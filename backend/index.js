import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

// Simple root route to verify backend is running
app.get("/", (req, res) => {
  res.send("Welcome to the Wake Word Backend!");
});

app.post("/api/check-wakeword", upload.single("audio"), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    console.error("❌ No file received.");
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  console.log("🎧 Received file:", req.file.originalname);

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("model", "whisper-1");

    console.log("📤 Sending to OpenAI Whisper API...");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer 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`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Whisper API Error:", result);
      return res.status(500).json({ error: "Whisper API failed", details: result });
    }

    const transcript = result.text?.toLowerCase() || "";
    console.log("📝 Transcript:", transcript);

    const detected =
      transcript.includes("okay chef") ||
      transcript.includes("ok chef") ||
      transcript.includes("okay shelf") ||
      transcript.includes("okie chef");

    console.log("✅ Wake Word Detected:", detected);

    res.json({ transcript, wakeWordDetected: detected });
  } catch (err) {
    console.error("🔥 Internal Error:", err);
    res.status(500).json({ error: "Failed to process audio", details: err.message });
  } finally {
    // Clean up uploaded audio file
    fs.unlink(filePath, (err) => {
      if (err) console.warn("⚠️ Failed to delete temp file:", err);
    });
  }
});

app.listen(3002, () => {
  console.log("🚀 Wake word backend running at http://localhost:3002");
});
