// src/pages/transaction/SplitList.tsx
import React from "react";
import type { Split, User } from "../utils/types";
export const SplitList: React.FC<{ splits?: Split[], me: User, currency:string, payer_display_name: string }> = ({ splits, me, currency, payer_display_name }) => {
  if (!splits || !splits.length) return <div>No splits. An error has occured</div>;

  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }
  const money_color = (payer_display_name === "You") ? ("text-green-700") : ("text-red-700")
  return (
    <div className="space-y-4">
      {/* Header */}
      <p className="text-lg font-semibold text-gray-800">
        Owed to {payer_display_name}
      </p>

      {/* Split List */}
      <div className="divide-y divide-gray-200 border rounded-xl shadow-sm bg-white">
        {splits.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 transition"
          >
            {/* Name */}
            <span className="font-medium text-gray-700">
              {s.user_id === me.id ? "You" : s.user_display_name}
            </span>

            {/* Amount */}
            <span className={`font-semibold ${money_color}`}>
              {truncateToTwoDecimals(s.amount_cents)} {currency} 
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
