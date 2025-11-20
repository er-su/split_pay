import React from "react";
import type { Transaction } from "../utils/types";
import { TransactionCard } from "./TransactionCard";

type Props = {
  transactions: Transaction[];
  onDeleted?: (id: number) => void;
};

export const TransactionList: React.FC<Props> = ({ transactions, onDeleted }) => {
  if (!transactions?.length) return <div>No transactions yet.</div>;
  return (
    <div>
      {transactions.map((t) => (
        // 🔹 UPDATED: forward onDeleted to each card
        <TransactionCard key={t.id} tx={t} onDeleted={onDeleted} />
      ))}
    </div>
  );
};
// export const TransactionList: React.FC<{ transactions: Transaction[] }> = ({ transactions, }) => {
//   if (!transactions?.length) return <div>No transactions yet.</div>;
//   return (
//     <div>
//       {transactions.map((t) => <TransactionCard key={t.id} tx={t}  />)}
//     </div>
//   );
// };
