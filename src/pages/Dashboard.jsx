// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Mic, Settings } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("Loading...");

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLanguage(data.language || "Not set");
        } else {
          setLanguage("Not found");
        }
      } catch (error) {
        console.error("Error fetching language:", error);
        setLanguage("Error");
      }
    };

    fetchUserLanguage();
  }, [user]);

  const handleStartCooking = () => {
    navigate("/assistant");
  };

  return (
    <div className="min-h-screen bg-white py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {user?.email?.split("@")[0] || "Chef"}
          </h1>
          <button onClick={() => navigate("/settings")}
            className="text-gray-600 hover:text-black">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <Card className="mb-6">
          <CardContent className="py-6 px-4">
            <p className="text-gray-700 mb-2">
              Preferred Language:
            </p>
            <p className="text-lg font-semibold text-blue-600">
              {language}
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleStartCooking}
          className="w-full flex gap-2 items-center justify-center text-lg py-6"
        >
          <Mic className="w-5 h-5" />
          Start Cooking
        </Button>
      </div>
    </div>
  );
}
