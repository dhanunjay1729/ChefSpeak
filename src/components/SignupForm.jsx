// src/components/SignupForm.jsx
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

const languages = ["English", "Hindi", "Telugu", "Tamil"];

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("English");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const userDoc = doc(db, "users", userCred.user.uid);
      await setDoc(userDoc, {
        email,
        language,
        createdAt: Timestamp.fromDate(new Date()),
      });
      alert("Signup successful!");
      navigate("/dashboard"); // Use react-router's `useNavigate` hook
    } catch (err) {
      console.error("Signup error:", err.code, err.message);
      if (err.code === "auth/email-already-in-use") {
        alert("Email is already in use. Please log in or use a different email.");
      } else if (err.code === "auth/weak-password") {
        alert("Password is too weak. Please choose a stronger password.");
      } else if (err.code === "auth/invalid-email") {
        alert("Invalid email format. Please enter a valid email.");
      } else {
        alert("Signup failed: " + err.message);
      }
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-sm mx-auto">
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 border rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <select
        className="w-full p-2 border rounded"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
        Sign Up
      </button>
    </form>
  );
}
