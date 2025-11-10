import React from "react";
import type { Group, User } from "../utils/types";
import { useNavigate } from "react-router-dom";

type GroupInfo = { group: Group, me: User | null};

export const GroupCard: React.FC<GroupInfo> = ({ group, me }) => {
  const nav = useNavigate();
  const creator_name = me?.id == group.created_by ? "You" : group.creator_display_name
  return (
    <div
      onClick={() => nav(`/group/${group.id}`)}
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        cursor: "pointer",
        marginBottom: 8,
      }}
    >
      <div style={{ fontWeight: 700 }}>{group.name}</div>
      <div style={{ fontSize: 13, color: "#666" }}>Created by {creator_name} </div>
      <div style={{ fontSize: 13, color: "#666" }}>{group.base_currency}</div>
      <div style={{ fontSize: 13, color: "#666" }}>{group.description ? group.description : "No description"}</div>
    </div>
  );
};
