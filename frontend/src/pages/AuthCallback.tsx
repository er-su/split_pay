// frontend/src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import  api  from "../components/api";
import GoogleLogin from "../components/googleLogin";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
       
        // Cookie is HttpOnly; test by calling /api/auth/me
        const { data } = await api.get("/api/auth/me");
        console.log("Logged in as:", data.user);
        navigate("/"); // or your dashboard
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/"); // optional: fallback
      }
    })();
  }, [navigate]);

  return <p>Signing you in…</p>;
}