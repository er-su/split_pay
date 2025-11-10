import React from "react";
import type { Transaction, Due } from "../utils/types";
import { DueCard } from "./DueCard";

export const DueList: React.FC<{ dues: Due[], currency: string}> = ({ dues, currency }) => {
  if (!dues?.length) return <div>No other members yet.</div>;
  return (
    <div>
      {dues.map((due) => <DueCard key={due.other_user_id} due={due} currency={currency} />)}
    </div>
  );
};

