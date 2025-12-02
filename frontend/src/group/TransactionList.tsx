import React from "react";
import type { Transaction } from "../utils/types";
import { TransactionCard } from "./TransactionCard";

type Props = {
  transactions: Transaction[];
  onDeleted?: (id: number) => void;
   isAdmin: boolean;
  currentUserId: number | null;
  isArchived: boolean;
};

export const TransactionList: React.FC<Props> = ({ transactions, isAdmin,currentUserId,isArchived }) => {
  if (!transactions?.length) return <div>No transactions yet.</div>;
  return (
    <div>
      {transactions.map((t) => (
        // 🔹 UPDATED: forward onDeleted to each card
        <TransactionCard key={t.id} tx={t} isAdmin={isAdmin} currentUserId={currentUserId} isArchived={isArchived} />
      ))}
    </div>
  );
};