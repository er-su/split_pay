
import React from "react";
import type { Group } from "../utils/types";
import { GroupCard } from "./GroupCard";

type Props = { groups: Group[] };

export const GroupList: React.FC<Props> = ({ groups }) => {
  if (!groups?.length) {
    return <div>No groups yet... create one!</div>;
  }
  return (
    <div>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  );
};
