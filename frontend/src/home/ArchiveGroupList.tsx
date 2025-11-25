import React from "react";
import type { Group, User } from "../utils/types";
import { ArchiveGroupCard } from "./ArchiveGroupCard";
import "../App.css"
type Props = { groups: Group[], me: User | null };

export const ArchiveGroupList: React.FC<Props> = ({ groups, me }) => {
  if (!groups?.length) {
    return <div>No groups yet... create one!</div>;
  }
  return (
    <div>
      {groups.map((g) => (
        <ArchiveGroupCard key={g.id} group={g} me={me} />
      ))}
    </div>
  );
};