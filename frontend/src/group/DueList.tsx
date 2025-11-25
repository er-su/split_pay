import React from "react";
import type {  Due } from "../utils/types";
import { DueCard } from "./DueCard";

export const DueList: React.FC<{ dues: Due[], currency: string;  isAdmin: boolean; numberGroupId:number}> = ({ dues, currency,isAdmin, numberGroupId }) => {
  if (!dues?.length) return <div>No other members yet.</div>;
  return (
    <div>
      {dues.map((due) => <DueCard key={due.other_user_id} due={due} currency={currency} isAdmin={isAdmin} numberGroupId={numberGroupId} />)}
    </div>
  );
};

