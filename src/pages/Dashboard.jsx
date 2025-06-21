// src/pages/Dashboard.jsx
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl">Welcome, {user?.email}</h1>
    </div>
  );
}
