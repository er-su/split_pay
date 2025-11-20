// src/pages/EditTransactionPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api_util";
import type { Member, Transaction } from "../utils/types";

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
    <form onSubmit={submit} style={{ marginBottom: 16 }}>
      <h3>Edit Transaction</h3>

      {/* Title */}
      <div>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {/* Memo */}
      <div>
        <label>
          Memo
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ marginLeft: 8, verticalAlign: "top" }}
            placeholder="Optional"
          />
        </label>
      </div>

      {/* Payer */}
      <div>
        <label>
          Payer
          <select
            value={payerId}
            onChange={(e) => setPayerId(Number(e.target.value))}
            required
            style={{ marginLeft: 8 }}
          >
            <option value="">Select payer</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name || `User ${m.user_id}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Currency */}
      <div>
        <label>
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            style={{ marginLeft: 8 }}
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
        <h4>Splits</h4>
        {splits.map((split, i) => (
          <div key={i} style={{ marginBottom: 8, display: "flex", gap: 8 }}>
            <select
              value={split.user_id}
              onChange={(e) => updateSplit(i, "user_id", Number(e.target.value))}
              required
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
            />

            <input
              type="text"
              placeholder="Note"
              value={split.note || ""}
              onChange={(e) => updateSplit(i, "note", e.target.value)}
            />

            {splits.length > 1 && (
              <button type="button" onClick={() => removeSplit(i)}>
                ✕
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addSplit}>
          + Add Split
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </div>
      )}
    </form>
  );
};

export default EditTransactionPage;
