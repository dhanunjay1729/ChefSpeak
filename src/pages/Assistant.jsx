// src/pages/Assistant.jsx
import { useEffect, useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Add the speakViaGoogleTTS function
const speakViaGoogleTTS = async (text, language) => {
  const response = await fetch("http://localhost:3001/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.play();
};

export default function Assistant() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [language, setLanguage] = useState("English");
  const recognitionRef = useRef(null);

  const languageMap = {
    English: "en-IN",
    Hindi: "hi-IN",
    Telugu: "te-IN",
    Tamil: "ta-IN",
  };

  useEffect(() => {
    const fetchLanguage = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLanguage(data.language || "English");
        }
      } catch (err) {
        console.error("Failed to fetch language:", err);
      }
    };
    fetchLanguage();
  }, [user]);

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = steps.length > 0 ? "en-US" : languageMap[language] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    setIsListening(true);

    recognition.start();

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript.toLowerCase();
      setQuery(spokenText);
      recognition.stop();
      setIsListening(false);

      if (steps.length > 0) {
        // Handle as command
        if (spokenText.includes("next")) {
          const next = Math.min(currentStepIndex + 1, steps.length - 1);
          setCurrentStepIndex(next);
          speakViaGoogleTTS(steps[next], language); // Replace speakSteps([...])
        } else if (spokenText.includes("repeat")) {
          speakViaGoogleTTS(steps[currentStepIndex], language); // Replace speakSteps([...])
        } else if (spokenText.includes("back") || spokenText.includes("previous")) {
          const prev = Math.max(0, currentStepIndex - 1);
          setCurrentStepIndex(prev);
          speakViaGoogleTTS(steps[prev], language); // Replace speakSteps([...])
        } else {
          alert("Unrecognized command. Please say 'next', 'repeat', or 'back'.");
        }
      } else {
        // Handle as dish query
        await fetchRecipeSteps(spokenText);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
  };

  const fetchRecipeSteps = async (spokenText) => {
    try {
      const prompt = `Give me a step-by-step recipe for making ${spokenText}. Respond only in ${language}.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a multilingual professional chef assistant. Always give clear, numbered steps in the user's preferred language: ${language}.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "No response from assistant.";

      const parsedSteps = text
        .split(/\n+/)
        .filter((line) => line.trim().match(/^\d+[\).]/))
        .map((step) => step.trim());

      setSteps(parsedSteps);
      setCurrentStepIndex(0);
    } catch (err) {
      console.error("Error fetching recipe steps:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white py-10 px-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">ChefSpeak Assistant</h1>

      <Button
        onClick={handleMicClick}
        className="flex items-center gap-2 px-6 py-4 text-lg mb-6"
        disabled={isListening}
      >
        {isListening ? <Loader2 className="animate-spin w-5 h-5" /> : <Mic className="w-5 h-5" />}
        {isListening ? "Listening..." : "Tap to Speak"}
      </Button>

      {query && (
        <p className="text-gray-700 text-lg mb-4">
          You said: <span className="font-semibold">{query}</span>
        </p>
      )}

      <div className="space-y-3 w-full max-w-md">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gray-100 rounded-xl p-4 shadow flex justify-between items-start ${
              index === currentStepIndex ? "border-2 border-blue-400" : ""
            }`}
          >
            <span>{step}</span>
            <button onClick={() => speakViaGoogleTTS(step, language)}>
              <Volume2 className="w-5 h-5 text-gray-500 hover:text-black" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
