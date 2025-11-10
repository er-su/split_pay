import React from "react";
import type { Transaction } from "../utils/types";
import { useNavigate } from "react-router-dom";

export const TransactionCard: React.FC<{ tx: Transaction }> = ({ tx }) => {
  const nav = useNavigate();
  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }
  return (
    <div onClick={() => nav(`/transaction/${tx.id}`)} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8, borderRadius: 6, cursor: "pointer" }}>
      <div style={{ fontWeight: 600 }}>{tx.title}</div>
      <div style={{ color: "#666" }}>{truncateToTwoDecimals(tx.total_amount_cents)} {tx.currency}</div>
    </div>
  );
};
