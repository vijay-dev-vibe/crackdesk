import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem("admin_auth", "true");
        navigate("/admin/dashboard");
      } else {
        setError("Invalid credentials. This area is restricted.");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-900/30 border border-red-800 mb-4">
            <ShieldAlert className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">ArtifAI Prep — Internal Access Only</p>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-3 mb-6 text-xs text-amber-400 text-center">
          ⚠️ Unauthorized access is prohibited and monitored.
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-400 mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-300">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold"
          >
            {loading ? "Verifying..." : "Access Admin Panel"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Not an admin?{" "}
          <a href="/login" className="text-gray-500 hover:text-gray-300 underline">
            Go to public login
          </a>
        </p>
      </div>
    </div>
  );
}