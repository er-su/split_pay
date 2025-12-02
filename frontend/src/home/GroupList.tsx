import React from "react";
import type { Group, User } from "../utils/types";
import { GroupCard } from "./GroupCard";
type Props = { groups: Group[], me: User | null };

export const GroupList: React.FC<Props> = ({ groups, me }) => {
  if (!groups?.length) {
    return <div className="text-center text-red-800">No Groups Yet!</div>;
  }
  return (
    <div>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} me={me} />
      ))}
    </div>
  );
};
