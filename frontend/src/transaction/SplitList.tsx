// src/pages/transaction/SplitList.tsx
import React from "react";
import type { Split, User } from "../utils/types";
import "./SplitList.css"
export const SplitList: React.FC<{ splits?: Split[], me: User, payer_display_name: string }> = ({ splits, me, payer_display_name }) => {
  if (!splits || !splits.length) return <div>No splits.</div>;

  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }

  return (
    <ul>
      {splits.map((s, i) => (
        <li key={i}>
           {s.user_id === me.id ? "You" : s.user_display_name} {truncateToTwoDecimals(s.amount_cents)}
        </li>
      ))}
    </ul>
  );
};
