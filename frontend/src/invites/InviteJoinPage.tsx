// src/pages/invite/InviteJoinPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api_util";

export default function InviteJoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Joining group...");

  useEffect(() => {
    const joinGroup = async () => {
      if (!token) {
        setStatus("Invalid invite link");
        return;
      }
      try {
        const res = await apiFetch<{ message: string; group_id?: number }>(
          `/groups/join/${token}`,
          { method: "GET" }
        );
        setStatus(res.message);
        if (res.group_id) {
          setTimeout(() => navigate(`/group/${res.group_id}`), 1500);
        }
      } catch (err: any) {
        if (err.status === 401) {
          // not authenticated → redirect to Google login
          window.location.href = "/api/auth/google/login";
          return;
        }
        setStatus("Invalid or expired invite link");
      }
    };
    joinGroup();
  }, [token, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="text-lg font-medium">{status}</p>
    </div>
  );
}
