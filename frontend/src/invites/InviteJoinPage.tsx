// src/pages/group/GroupPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../utils/api_util";

export default function GroupPage() {
  const { groupId } = useParams();
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    try {
      const res = await apiFetch<{ invite_link: string }>(
        `/api/groups/${groupId}/invite`,
        { method: "POST" }
      );
      setInviteLink(res.invite_link);
    } catch (err) {
      console.error("Failed to create invite:", err);
      alert("Could not create invite link.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Group #{groupId}</h1>

      <button
        onClick={handleCreateInvite}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Create Invite Link
      </button>

      {inviteLink && (
        <div className="mt-3 p-3 bg-gray-100 rounded">
          <p className="text-sm">Share this link:</p>
          <input
            className="w-full mt-1 p-2 border rounded"
            value={inviteLink}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
