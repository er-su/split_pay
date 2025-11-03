// src/pages/transaction/SplitList.tsx
import React from "react";
import type { Split } from "../utils/types";

export const SplitList: React.FC<{ splits?: Split[] }> = ({ splits }) => {
  if (!splits || !splits.length) return <div>No splits.</div>;
  return (
    <ul>
      {splits.map((s, i) => (
        <li key={i}>
          {s.user_display_name ?? `User ${s.user_id}`}: {s.amount_cents}
        </li>
      ))}
    </ul>
  );
};
