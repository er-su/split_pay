import React from "react";
import type { Transaction } from "../utils/types";
import { TransactionCard } from "./TransactionCard";

export const TransactionList: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  if (!transactions?.length) return <div>No transactions yet.</div>;
  return (
    <div>
      {transactions.map((t) => <TransactionCard key={t.id} tx={t} />)}
    </div>
  );
};
