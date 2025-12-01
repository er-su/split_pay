// src/pages/group/GroupPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiFetch } from "../utils/api_util";
import type { Transaction, Group, User, Due, Member } from "../utils/types";
import { Loading } from "../components/Loading";
import { TransactionList } from "./TransactionList";
import { DueList } from "./DueList";
import { MemberList } from "./MemberList";
import { User as IconUser, DollarSign } from "lucide-react";

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
      await apiFetch(`/groups/${groupId}`, { method: "DELETE" });
      alert("Group deleted successfully.");
      navigate("/"); // redirect to home or groups list
    } catch (err) {
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
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
      //setError(err);
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    }
  };

  useEffect(() => {
    if (!numberGroupId) return;
    load();
  }, [groupId]);

  const onNewTransaction = (tx: Transaction) => {
    setTransactions((prev) => (prev ? [tx, ...prev] : [tx]));
  };
  const isArchived = group?.is_archived
  // ---------------- Render ----------------

  if (!group) return <Loading />;

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-2 text-center">{group.name}</h1>
      <div className="text-base text-muted-foreground text-center mt-2">{group.description}</div>
      <div className="w-full flex justify-center gap-3 mt-2">
        <div className="flex gap-1 text-muted-foreground content-center"><IconUser size={20} />{group.creator_display_name}</div>
        <div className="flex gap-0.5 text-muted-foreground content-center"><DollarSign size={20} />{group.base_currency}</div>
      </div>
      {/* {group.base_currency}
      {group.creator_display_name}
      {group.is_archived} */}
      <hr className="my-4 border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-5">
        <div className="border p-10 rounded-4xl bg-blue-100 w-11/12 mx-auto">
          <h2 className="text-2xl font-semibold mt-1 mb-1 text-center">User Dues</h2>
          <div className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-5"></div>
          {dues !== null ? (
            <DueList dues={dues} currency={group.base_currency} isAdmin={isAdmin} numberGroupId={numberGroupId} />
          ) : (
            <p>Invite your friends!</p>
          )}
        </div>

        {/* Transactions */}
        <div className="border p-10 rounded-4xl bg-blue-100 w-11/12 mx-auto">
          <h2 className="text-2xl font-semibold mt-1 mb-1 text-center">Transactions</h2>
          <div className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-5"></div>
          {transactions !== null ? (
            <TransactionList
              transactions={transactions}
              isAdmin={isAdmin}
              currentUserId={me?.id ?? null}
              isArchived={group.is_archived}
            />
          ) : (
            <p>Create some transactions!</p>
          )}
        </div>
      </div>
      <div>
        <div className="flex">
          {/* New Transaction Button */}
          {isArchived ? null : <button className="px-4 py-2 border border-gray-400 rounded-lg cursor-pointer hover:bg-gray-50" onClick={handleCreateTransaction}>Create Transaction</button>}

          <div className="grow" />

          {/* Invite Link */}
          {isAdmin && !isArchived ? (
            <button
              onClick={handleCreateInvite}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer"
            >
              Create Invite Link
            </button>
          ) : (
            null
          )}
        </div>

        {inviteLink && (
          <div className="mt-3 p-3 bg-gray-100 rounded">
            <p className="text-sm">Share this link:</p>
            <input className="w-full mt-1 p-2 border rounded" value={inviteLink} readOnly />
          </div>
        )}
      </div>
    </div>
  );
}
