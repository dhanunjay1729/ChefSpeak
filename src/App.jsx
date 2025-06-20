// ✅ src/App.jsx (Final Fix with stepsRef for Live Access)

//useref, a react hook that is used to create a reference that persists across renders
// without causing re-renders when the reference changes.
//useCallback, a react hook that is used to memoize a function so that 
// it does not get recreated on every render.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function App() {
  const [listening, setListening] = useState(false);
  // user's speech input
  const [transcript, setTranscript] = useState("");
  // AI's response with recipe steps
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  //useRef
  // stores the instancce of SpeechRecognition and SpeechSynthesis. 
  // This object is responsible for listening to the user's speech and converting it to text.
  const recognitionRef = useRef(null);
  // stores the instance of SpeechSynthesis, which is used to convert text to speech.
  // This object is responsible for speaking the steps out loud.
  const synthRef = useRef(window.speechSynthesis);
  // useRef to keep a live reference to the steps array
  // This allows us to access the latest steps without needing to re-render the component.
  const stepsRef = useRef([]);

  // responsible for speaking the current step
const speakStep = useCallback((index) => {
  const stepText = stepsRef.current[index];
  console.log("🗣️ speakStep called with index:", index, "→", stepText);

  if (!stepText) {
    console.warn("⚠️ No step found to speak.");
    return;
  }

  // Cancel ongoing speech
  if (synthRef.current.speaking || synthRef.current.pending) {
    console.log("🛑 Cancelling any ongoing speech...");
    synthRef.current.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(stepText);
  utterance.lang = 'en-US'; // ✅ en-US is more reliable than en-IN
  utterance.rate = 1;

  utterance.onstart = () => {
    console.log("🔊 Speech started:", stepText);
    setSpeaking(true);
  };

  utterance.onend = () => {
    console.log("✅ Speech ended.");
    setSpeaking(false);
    setTimeout(() => {
      try {
        recognitionRef.current?.start();
        console.log("🎙️ Recognition restarted.");
      } catch (e) {
        console.warn("⚠️ Could not restart recognition:", e);
      }
    }, 400); // slight delay to allow TTS to finish cleanly
  };

  // Use timeout to avoid browser cancel-speak race
  setTimeout(() => {
    synthRef.current.speak(utterance);
  }, 250); // ✅ give it 250ms after cancel
}, []);


const goToNextStep = useCallback(() => {
  console.log("➡️ goToNextStep called.");
  setCurrentStepIndex((prevIndex) => {
    const nextIndex = prevIndex + 1;
    if (nextIndex < stepsRef.current.length) {
      console.log("🔄 Advancing to step:", nextIndex);
      return nextIndex;
    } else {
      console.log("🚧 Already at last step. Repeating current step:", prevIndex);
      if (stepsRef.current[prevIndex]) {
        speakStep(prevIndex);
      } else {
        console.warn("⚠️ Step not found at index:", prevIndex);
      }
      return prevIndex; // Don't increment
    }
  });
}, [speakStep]);


  const goToPreviousStep = () => {
    console.log("⬅️ goToPreviousStep called.");
    recognitionRef.current?.abort();
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    console.log("🔄 Setting currentStepIndex to:", prevIndex);
    setCurrentStepIndex(prevIndex);
  };

  const repeatCurrentStep = () => {
    console.log("🔁 repeatCurrentStep called.");
    recognitionRef.current?.abort();
    speakStep(currentStepIndex);
  };

  useEffect(() => {
    console.log("📦 useEffect triggered for steps:", steps);
    if (steps.length > 0) {
      stepsRef.current = steps; // ✅ keep stepsRef updated
      setCurrentStepIndex(0);
    }
  }, [steps]);

  useEffect(() => {
    console.log("🔄 useEffect for currentStepIndex:", currentStepIndex);
    if (stepsRef.current.length > 0) {
      speakStep(currentStepIndex);
    }
  }, [currentStepIndex, speakStep]);

  const handleMicClick = () => {
    console.log("🎤 handleMicClick called.");
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.error("Speech Recognition is not supported.");
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!recognitionRef.current) {
      console.log("🆕 Initializing SpeechRecognition.");
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("🎙️ Recognition started.");
        setListening(true);
      };
      recognition.onend = () => {
        console.log("🛑 Recognition ended.");
        setListening(false);
      };
      recognition.onerror = (e) => {
        if (e.error !== 'aborted') {
          console.error("Recognition error:", e);
          alert(`Speech Recognition Error: ${e.error}`);
        }
      };

      recognition.onresult = (e) => {
        const speechText = e.results[0][0].transcript.toLowerCase();
        console.log("📥 Speech recognition result:", speechText);
        setTranscript(speechText);

        if (/next/.test(speechText)) {
          console.log("📤 Detected 'next' command.");
          goToNextStep();
        } else if (/previous|back/.test(speechText)) {
          console.log("📤 Detected 'previous/back' command.");
          goToPreviousStep();
        } else if (/repeat/.test(speechText)) {
          console.log("📤 Detected 'repeat' command.");
          repeatCurrentStep();
        } else {
          console.log("🌐 Fetching recipe for query:", speechText);
          fetchRecipeFromAI(speechText);
        }
      };

      recognitionRef.current = recognition;
    }

    try {
      console.log("🚀 Starting recognition.");
      recognitionRef.current.start();
    } catch (err) {
      if (err.name !== "InvalidStateError") {
        console.error("Error starting recognition:", err);
      }
    }
  };

  const fetchRecipeFromAI = async (query) => {
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `Give me a numbered list of clear step-by-step instructions only (no ingredients) for "${query}". Use one list with Step 1, Step 2, ... format. Max 15 steps.`,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const aiText = data.choices?.[0]?.message?.content || "No response from AI.";
      setResponse(aiText);

      const cleanedSteps = aiText.match(/Step\s*\d+[:.]\s.+/gi);
      if (cleanedSteps?.length) {
        console.log("✅ Extracted cleaned steps:", cleanedSteps);
        setSteps(cleanedSteps);
        stepsRef.current = cleanedSteps; // ✅ update ref immediately
      } else {
        console.warn("⚠️ Could not extract proper steps. Raw AI response:", aiText);
      }

    } catch (err) {
      console.error("🌐 Error calling OpenAI API:", err);
      setResponse("Something went wrong while fetching the recipe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-xl w-full"
      >
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl font-bold text-center">ChefSpeak</h1>
            <p className="text-center text-gray-600">Your AI voice assistant for hands-free cooking</p>
            <div className="flex justify-center mt-6">
              <Button size="lg" onClick={handleMicClick} className={`rounded-full p-6 ${listening ? 'animate-pulse bg-blue-700' : ''}`}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6 mr-2" />}
                {listening ? 'Listening…' : 'Start Speaking'}
              </Button>
            </div>
            {transcript && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">You said:</p>
                <p className="text-lg font-medium text-blue-600">"{transcript}"</p>
              </div>
            )}
            {response && (
              <div className="mt-6 bg-gray-50 border rounded-md p-4 whitespace-pre-wrap text-sm">
                {response}
              </div>
            )}
            {steps.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border rounded text-gray-800 text-sm">
                <strong>Step {currentStepIndex + 1}:</strong> {steps[currentStepIndex]}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
