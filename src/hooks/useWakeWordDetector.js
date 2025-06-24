// src/hooks/useWakeWordDetector.js
import { useEffect, useRef } from "react";

export default function useWakeWordDetector({ onWakeWord, wakeWords = ["okay chef"], lang = "en-US" }) {
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Heard:", transcript);
      for (let word of wakeWords) {
        if (transcript.includes(word.toLowerCase())) {
          onWakeWord(word);
          break;
        }
      }
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
    };

    recognition.onend = () => {
      // Restart listening automatically
      recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => recognition.stop(); // cleanup on unmount
  }, [onWakeWord, wakeWords, lang]);
}
