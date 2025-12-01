// src/pages/EditTransactionPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api_util";
import type { Member, Transaction } from "../utils/types";
import CalculatorWidget from "@/components/CalculatorWidget";

type SplitInput = {
  user_id: number;
  amount_cents: string; // local numeric representation
  note?: string;
};

const EditTransactionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();       // /transaction/:id/edit
  const txId = Number(id);
  const navigate = useNavigate();



  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [payerId, setPayerId] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<Member[]>([]);
  const [splits, setSplits] = useState<SplitInput[]>([
    { user_id: -1, amount_cents: "", note: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  
  // --- Load existing transaction + group members ---
  useEffect(() => {
    if (!txId) return;

    (async () => {
      try {
        const tx = await api.getTransaction(txId);

        // prefill form fields from existing transaction
        setTitle(tx.title ?? "");
        setMemo(tx.memo ?? "");
        setPayerId(tx.payer_id);
        setCurrency(tx.currency);

        setSplits(
          tx.splits.map((s) => ({
            user_id: s.user_id,
            amount_cents: s.amount_cents.toString(),
            note: s.note ?? "",
          }))
        );

        // fetch members of this transaction's group
        const groupMembers = await api.fetchGroupMembers(tx.group_id);
        setMembers(groupMembers || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [txId]);

  const currencies = [
    "USD", "EUR", "GBP", "JPY", "CAD",
    "AUD", "CHF", "CNY", "INR", "KRW", "SGD",
  ];

  // --- Split field management ---
  const addSplit = () => {
    setSplits([...splits, { user_id: -1, amount_cents: "", note: "" }]);
  };

  const updateSplit = (index: number, key: keyof SplitInput, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [key]: value };
    setSplits(newSplits);
  };

  const removeSplit = (index: number) => {
    const newSplits = splits.filter((_, i) => i !== index);
    setSplits(newSplits);
  };

  // --- Submit form (EDIT) ---
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!payerId) throw new Error("Please select a payer.");

      const filteredSplits = splits.filter((s) => s.user_id && s.amount_cents);
      if (filteredSplits.length === 0) {
        throw new Error("At least one split is required.");
      }

      const totalAmount = filteredSplits.reduce(
        (a, s) => a + Number(s.amount_cents || 0),
        0
      );

      const payload = {
        payer_id: payerId,
        total_amount_cents: totalAmount.toString(),
        title,
        memo: memo || null,
        splits: filteredSplits.map<SplitInput>((s) => ({
          user_id: Number(s.user_id),
          amount_cents: s.amount_cents.toString(),
          note: s.note || undefined,
        })),
      };
      
      // IMPORTANT: use txId for edit
      const updated = await api.editTransaction(txId, payload);

      // after saving, go back to the transaction page
      navigate(`/transaction/${updated.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!txId) return <div>Invalid transaction id</div>;
  if (loading) return <div>Loading…</div>;

  return (
    <>
    <CalculatorWidget />
    <form onSubmit={submit} className="container mx-auto space-y-6">
      <h1 className="text-4xl text-green-900 font-bold text-center">Edit Transaction</h1>

      {/* Title */}
      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      {/* Memo */}
      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Memo
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className=" mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      {/* Payer */}
      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Payer
        </label>
        <select
          value={payerId}
          onChange={(e) => setPayerId(Number(e.target.value))}
          required
          className="
            mt-1
            block w-full
            rounded-md
            border border-gray-300
            bg-white
            px-4 py-2
            text-gray-700
            shadow-sm
            outline-none
            transition
            hover:border-gray-400
            focus:border-blue-600
            focus:ring-2 focus:ring-blue-600
            cursor-pointer
          "
        >
          <option value="" disabled>--Required--</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name || `User ${m.user_id}`}
              </option>
            ))}
          </select>

      </div>

      {/* Currency */}
      <div className="flex flex-col w-full">
        <label className="text-gray-700 font-medium mb-1">
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            className="
              mt-1
              block w-full
              rounded-md
              border border-gray-300
              bg-white
              px-4 py-2
              text-gray-700
              shadow-sm
              outline-none
              transition
              hover:border-gray-400
              focus:border-blue-600
              focus:ring-2 focus:ring-blue-600
              cursor-pointer
            "
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Splits */}
      <div>
        <h4 className="text-lg font-semibold text-gray-600 mb-4">Splits</h4>
        {splits.map((split, i) => (
          <div key={i} className="flex flex-col md:flex-row items-center gap-3 p-3 rounded-lg bg-white">
            <select
              value={split.user_id}
              onChange={(e) => updateSplit(i, "user_id", Number(e.target.value))}
              required
              className="flex-1 border-gray-300 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select user</option>
              {members
                .filter((m) => m.user_id !== payerId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name || `User ${m.user_id}`}
                  </option>
                ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={split.amount_cents}
              onChange={(e) =>
                updateSplit(i, "amount_cents", Number(e.target.value))
              }
              required
              className="flex-1 border-gray-300 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"

            />

            <input
              type="text"
              placeholder="Note"
              value={split.note || ""}
              onChange={(e) => updateSplit(i, "note", e.target.value)}
              className="flex-1 border-gray-300 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"

            />

            {splits.length > 1 && (
              <button type="button" onClick={() => removeSplit(i)} className="px-3 py-1 text-red-600 hover:text-white hover:bg-red-600 rounded transition">
                ✕
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addSplit} className="mt-3 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition">
          + Add Split
        </button>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`
          w-full mx-auto block
          px-5 py-2
          rounded-lg font-semibold
          text-white text-center
          bg-green-700
          hover:bg-green-800
          transition-all duration-200
          hover:scale-105 active:scale-95
          shadow-md hover:shadow-lg
          disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md
        `}
      >
        {busy ? "Creating…" : "Edit Transaction"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </div>
      )}
    </form>
    </>
  );
};

export default EditTransactionPage;
