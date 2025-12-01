import React from "react";
import type { Transaction } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api_util";
import { useState } from "react";
import ConfirmButton from "../components/ConfirmDialogueButton";
type Props = {
  tx: Transaction;
  onDeleted?: (id: number) => void;
  isAdmin: boolean;
  currentUserId: number | null;
  isArchived: boolean;
};

export const TransactionCard: React.FC<Props> = ({ tx, isAdmin, currentUserId, isArchived }) => {
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

  const confirmDelete = async () => {
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
    <div onClick={() => nav(`/transaction/${tx.id}`)} className="border-black border bg-white hover:drop-shadow-md hover:scale-105 rounded-2xl p-3 m-2 text-center transition max-w-3/4 mx-auto">
      <div className="text-3xl mb-1">{tx.title}</div>
      <div className="text-gray-500">{truncateToTwoDecimals(tx.total_amount_cents)} {tx.currency} Owed To {tx.payer_display_name}</div>
      {/* Only show buttons if user is admin OR creator */}
      <div className="border-t pt-3 mt-3 flex flex-wrap gap-3">
        {canEditOrDelete && <button className="flex-1 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 transition text-white mx-auto w-3/4" onClick={goToEdit}> Edit</button>}
        {canEditOrDelete && <ConfirmButton buttonText="Delete" confirmText="Are you sure you want to PERMANENTLY delete this transaction?" 
          onConfirm={() => {
            confirmDelete()
          }} buttonClassName="flex-1 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white transition mx-auto w-3/4"/>}
      </div>

    </div>
  );
};
