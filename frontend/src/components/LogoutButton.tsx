import { apiFetch } from "../utils/api_util"; // assuming same util used for authenticated calls

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      // Redirect to login or homepage
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return <button onClick={handleLogout}>Log out</button>;
}
