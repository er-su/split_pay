// src/pages/CreateTransactionPage.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Transaction } from "../utils/types";
import { CreateTransactionForm } from "../group/CreateTransactionForm";

export default function CreateTransactionPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const numericGroupId = Number(groupId);

  if (!numericGroupId) {
    return <div>Invalid group id</div>;
  }

  const handleCreated = (tx: Transaction) => {
    // after creating, go to the transaction page (or back to the group)
    navigate(`/transaction/${tx.id}`);
    // or: navigate(`/group/${numericGroupId}`);
  };

  return (
    <div style={{ padding: 16 }}>
      <CreateTransactionForm
        groupId={numericGroupId}
        onCreated={handleCreated}
      />
    </div>
  );
}
