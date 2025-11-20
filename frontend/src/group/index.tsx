// src/pages/group/GroupPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiFetch } from "../utils/api_util";
import type { Transaction, Group, User, Due, Member } from "../utils/types";
import { Loading } from "../components/Loading";
import { TransactionList } from "./TransactionList";
import { DueList } from "./DueList";

export default function GroupPage() {
  const groupId = useParams().id;
  const navigate = useNavigate();
  const numberGroupId = Number(groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [dues, setDues] = useState<Due[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---------------- Handlers ----------------

  const handleDeleteGroup = async () => {
    if (!groupId) return;

    const confirmed = window.confirm("Are you sure you want to delete this group?");
    if (!confirmed) return;

    try {
      const resp = await apiFetch(`/groups/${groupId}`, { method: "DELETE" });
      console.log(resp)
      alert("Group deleted successfully.");
      navigate("/"); // redirect to home or groups list
    } catch (err) {
      console.error("Failed to delete group:", err);
      alert("Could not delete group.");
    }
  };

  const handleCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const res = await apiFetch<{ invite_link: string }>(`/groups/${groupId}/invite`, { method: "POST" });
      setInviteLink(res.invite_link);
      handleCopy(res.invite_link);
    } catch (err) {
      console.error("Failed to create invite:", err);
      alert("Could not create invite link.");
    }
  };

  const handleCreateTransaction = () => {
    if (!groupId) return;
    navigate(`/group/${groupId}/transactions/new`);
  };

  // ---------------- Data Loading ----------------

  const load = async () => {
    setError(null);

    try {
      const [g, txs, duesRes, meRes, membersRes] = await Promise.all([
        api.getGroup(numberGroupId),
        api.listTransactions(numberGroupId),
        api.getDues(numberGroupId),
        api.getMe(),
        api.fetchGroupMembers(numberGroupId),
      ]);

      setGroup(g);
      setTransactions(txs);
      setDues(duesRes);
      setMe(meRes);
      setMembers(membersRes || []);

      const membership = membersRes.find((m) => m.user_id === meRes.id);
      setIsAdmin(!!membership?.is_admin);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    if (!numberGroupId) return;
    load();
  }, [groupId]);

  const onNewTransaction = (tx: Transaction) => {
    setTransactions((prev) => (prev ? [tx, ...prev] : [tx]));
  };

  // ---------------- Render ----------------

  if (!group) return <Loading />;

  return (
    <div className="p-6">
      <h1>{group.name}</h1>
      <div style={{ marginBottom: 16 }}>{group.description}</div>

      {/* Delete Group Button */}
      {isAdmin && (
        <button
          onClick={handleDeleteGroup}
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded"
        >
          Delete Group
        </button>
      )}

      {/* User Dues */}
      <h2>User Dues</h2>
      {dues !== null ? (
        <DueList dues={dues} currency={group.base_currency} />
      ) : (
        <p>No other members yet!</p>
      )}

      {/* Transactions */}
      <h2>Transactions</h2>
      {transactions !== null ? (
        <TransactionList
          transactions={transactions}
          isAdmin={isAdmin}
          currentUserId={me?.id ?? null}
        />
      ) : (
        <p>Create some transactions!</p>
      )}

      {/* New Transaction Button */}
      <h2>New transaction</h2>
      <button onClick={handleCreateTransaction}>Create Transaction</button>

      {/* Invite Link */}
      {isAdmin ? (
        <button
          onClick={handleCreateInvite}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Create Invite Link
        </button>
      ) : (
        <p>You must be an admin to send invite to other people</p>
      )}

      {inviteLink && (
        <div className="mt-3 p-3 bg-gray-100 rounded">
          <p className="text-sm">Share this link:</p>
          <input className="w-full mt-1 p-2 border rounded" value={inviteLink} readOnly />
        </div>
      )}
    </div>
  );
}
