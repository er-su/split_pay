// src/pages/group/GroupPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiFetch } from "../utils/api_util";
import type { Transaction, Group, User, Due } from "../utils/types";
import { Loading } from "../components/Loading";
import { CreateTransactionForm } from "./CreateTransactionForm";
import { TransactionList } from "./TransactionList";
import { ErrorMessage } from "../components/ErrorMessage";
import { DueList } from "./DueList";

export default function GroupPage() {
  const groupId = useParams().id;
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [dues, setDues] = useState<Due[] | null>(null);

	console.log(groupId)

	const numberGroupId = Number(groupId)
  const handleCreateInvite = async () => {
    try {
      const res = await apiFetch<{ invite_link: string }>(
        `/groups/${groupId}/invite`,
        { method: "POST" }
      );
      setInviteLink(res.invite_link);
    } catch (err) {
      console.error("Failed to create invite:", err);
      alert("Could not create invite link.");
    }
  };

  const load = async () => {
    setError(null);
    try {
      const [g, txs, dues] = await Promise.all([api.getGroup(numberGroupId), api.listTransactions(numberGroupId), api.getDues(numberGroupId)]);
      setGroup(g);
      setTransactions(txs);
      setDues(dues)
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
		console.log(numberGroupId)
    if (!numberGroupId) return;
    load();
  }, [groupId]);

  const onNewTx = (tx: Transaction) => {
    setTransactions((prev) => (prev ? [tx, ...prev] : [tx]));
  };

  if (!group) return <Loading />;

  return (
    <div className="p-6">
      <h1>{group.name}</h1>
      <div style={{ marginBottom: 16 }}>{group.description}</div>
      
      <h2>User Dues</h2>
      {dues !== null ? <DueList dues={dues} currency={group.base_currency}/> : <p>No other members yet!</p>}
      

      <h2>Transactions</h2>
      {transactions !== null ? <TransactionList transactions={transactions}/> : <p>Create some transactions!</p>}
      

      <h2>New transaction</h2>
      <CreateTransactionForm groupId={numberGroupId} onCreated={onNewTx} />

      <button
        onClick={handleCreateInvite}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Create Invite Link
      </button>

      {inviteLink && (
        <div className="mt-3 p-3 bg-gray-100 rounded">
          <p className="text-sm">Share this link:</p>
          <input
            className="w-full mt-1 p-2 border rounded"
            value={inviteLink}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
