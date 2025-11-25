import React from "react";
import type { Transaction } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api_util";
import { useState } from "react";
type Props = {
  tx: Transaction;
  onDeleted?: (id: number) => void;
   isAdmin: boolean;
  currentUserId: number | null;
  isArchived: boolean;
};
export const TransactionCard: React.FC<Props> = ({ tx, isAdmin,currentUserId,isArchived }) => {
//export const TransactionCard: React.FC<{ tx: Transaction }> = ({ tx}) => {
  const nav = useNavigate();
   const [confirming, setConfirming] = useState(false);
     const [busy, setBusy] = useState(false);
  
  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }
  const isCreator =
    currentUserId != null && tx.creator_id === currentUserId;

  const canEditOrDelete = (isAdmin || isCreator) && !isArchived;
    const goToEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 👈 prevent card's onClick from firing
    nav(`/transaction/${tx.id}/edit`);
  };
  const startConfirmDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const cancelDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const confirmDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      setBusy(true);
      await api.deleteTransaction(tx.id);
     // onDeleted?.(tx.id); // parent removes it from the list
     
    } catch (err) {
      console.error("Failed to delete transaction", err);
    } finally {
      setBusy(false);
      setConfirming(false);
      window.location.reload();
    }
  };
  

  
  return (
    <div onClick={() => nav(`/transaction/${tx.id}`)} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8, borderRadius: 6, cursor: "pointer" }}>
      <div style={{ fontWeight: 600 }}>{tx.title}</div>
      <div style={{ color: "#666" }}>{truncateToTwoDecimals(tx.total_amount_cents)} {tx.currency}</div>
    {/* Only show buttons if user is admin OR creator */}
      {canEditOrDelete && (
        !confirming ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={goToEdit}>Edit</button>
            <button onClick={startConfirmDelete}>Delete</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Delete?</span>
            <button onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Yes"}
            </button>
            <button onClick={cancelDelete} disabled={busy}>
              No
            </button>
          </div>
        )
      )}
   
    </div>
  );
};
