import express from "express";
import cors from "cors";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import util from "util";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: "./google-tts-key.json", // path to your JSON key file
});

// Default route for the root path
app.get("/", (req, res) => {
  res.send("Welcome to the ChefSpeak Text-to-Speech API!");
});

app.post("/api/speak", async (req, res) => {
  const { text, language } = req.body;

  const languageVoiceMap = {
    english: "en-IN-Wavenet-D",
    hindi: "hi-IN-Wavenet-C",
    telugu: "te-IN-Standard-A",
    tamil: "ta-IN-Standard-A",
  };

  const voiceName = languageVoiceMap[language?.toLowerCase().trim()];

  // Validate input
  if (!text || !voiceName) {
    console.error("❌ Invalid input:", { text, language });
    return res.status(400).json({ error: "Missing or invalid text/language" });
  }

  const request = {
    input: { text },
    voice: {
      languageCode: voiceName.split("-").slice(0, 2).join("-"),
      name: voiceName,
    },
    audioConfig: { audioEncoding: "MP3" },
  };

  // Log the request being sent to Google TTS
  console.log("🔄 Request to Google TTS:", {
    text,
    language,
    voiceName,
  });

  try {
    const [response] = await client.synthesizeSpeech(request);
    res.set("Content-Type", "audio/mp3");
    res.send(response.audioContent);
  } catch (err) {
    console.error("TTS Error:", err);
    res.status(500).send("TTS failed");
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`TTS proxy server running on http://localhost:${PORT}`);
});
