import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api_util"; // assuming same util used for authenticated calls

export function LogoutButton() {
  const nav = useNavigate()
  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      // Redirect to login or homepage
      window.location.href = "/";
    } catch (err) {
      nav("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    }
  };

  return <button onClick={handleLogout}>Log out</button>;
}
