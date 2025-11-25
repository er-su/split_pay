import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// --- Types ---
export type GroupMember = {
  user_id: number;
  is_admin: boolean;
};

export type Group = {
  id: number;
  name: string;
  description?: string;
  base_currency: string;
  created_by?: number;
  creator_display_name?: string;
  location_name?: string;
  members?: GroupMember[];
};

export type User = {
  id: number;
  display_name?: string;
};

// --- Props ---
type GroupInfo = {
  group: Group;
  me: User | null;
  onDeleted?: (groupId: number) => void;
};

export const GroupCard: React.FC<GroupInfo> = ({ group, me, onDeleted }) => {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  
  const creator_name = me?.id === group.created_by ? "You" : group.creator_display_name;

  // --- Check if current user is admin ---
  const membership = group.members?.find(m => m.user_id === me?.id);
  const isAdmin = membership?.is_admin === true;

  // --- Edit handler ---
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      nav("/");
      return;
    }
    nav("/pages/GroupEditing", { state: { groupId: group.id } });
  };

  // --- Delete handler using fetch directly ---
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      setBusy(true);
      const res = await fetch(`/groups/${group.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete group: ${res.statusText}`);
      }

      alert("Group deleted successfully");
      onDeleted?.(group.id);
      nav("/"); // redirect home
    } catch (err) {
      console.error(err);
      alert("Failed to delete group.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => nav(`/group/${group.id}`)}
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        cursor: "pointer",
        marginBottom: 8,
        position: "relative",
      }}
    >
      <div style={{ fontWeight: 700 }}>{group.name}</div>
      <div style={{ fontSize: 13, color: "#666" }}>Created by {creator_name}</div>
      <div style={{ fontSize: 13, color: "#666" }}>{group.base_currency}</div>
      <div style={{ fontSize: 13, color: "#666" }}>
        {group.description || "No description"}
      </div>

      {isAdmin && (
        <>
          <button
            onClick={handleEdit}
            style={{
              marginTop: 8,
              marginRight: 8,
              padding: "4px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
            disabled={busy}
          >
            Edit
          </button>

          <button
            onClick={handleDelete}
            style={{
              marginTop: 8,
              padding: "4px 8px",
              fontSize: 12,
              cursor: "pointer",
              backgroundColor: "#ff4d4f",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </>
      )}
    </div>
  );
};
