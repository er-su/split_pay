// src/pages/transaction/SplitList.tsx
import React from "react";
import type { Split, User } from "../utils/types";

export const SplitList: React.FC<{ splits?: Split[], me: User, payer_display_name: string }> = ({ splits, me, payer_display_name }) => {
  if (!splits || !splits.length) return <div>No splits.</div>;

  return (
    <ul>
      {splits.map((s, i) => (
        <li key={i}>
          {payer_display_name} {" <-- "} {s.user_id === me.id ? "You" : s.user_display_name} {s.amount_cents}
        </li>
      ))}
    </ul>
  );
};
