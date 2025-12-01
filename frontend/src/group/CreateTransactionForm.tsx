import React, { useEffect, useState } from "react";
import { api } from "../utils/api_util";
import type { Member, Transaction, User } from "../utils/types";

type SplitInput = {
  user_id: number;
  amount_cents: string; // local numeric representation
  note?: string;
};

type Props = {
  groupId: number;
  onCreated?: (tx: Transaction) => void;
};

export const CreateTransactionForm: React.FC<Props> = ({ groupId, onCreated }) => {
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

  // --- Fetch group members ---
  useEffect(() => {
    (async () => {
      try {
        const res = await api.fetchGroupMembers(groupId);
        setMembers(res || []);
        console.log(members)
      } catch (err) {
        console.error("Failed to fetch group members:", err);
      }
    })();
  }, [groupId]);

  // --- Supported currencies ---
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

  // --- Submit form ---
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!payerId) throw new Error("Please select a payer.");

      const filteredSplits = splits.filter((s) => s.user_id && s.amount_cents);
      if (filteredSplits.length === 0) throw new Error("At least one split is required.");

      const totalAmount = filteredSplits.reduce(
        (a, s) => a + Number(s.amount_cents || 0),
        0
      );

      // Convert to backend payload structure
      const payload = {
        payer_id: payerId,
        total_amount_cents: totalAmount.toString(), // ✅ string as per backend spec
        currency,
        title,
        memo: memo || null,
        splits: filteredSplits.map<SplitInput>((s) => ({
          user_id: Number(s.user_id),
          amount_cents: s.amount_cents.toString(), // ✅ string for backend consistency
          note: s.note || undefined,
        })),
      };

      const created = await api.createTransaction(groupId, payload);
      onCreated?.(created);

      // Reset form
      setTitle("");
      setMemo("");
      setCurrency("USD");
      setPayerId("");
      setSplits([{ user_id: -1, amount_cents: "", note: "" }]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  // --- Render ---
  return (
    <form onSubmit={submit} style={{ marginBottom: 16 }}>
      <h3>Create Transaction</h3>

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
           Memo <br></br>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ marginLeft: 8, verticalAlign: "top"}}
            className="border-2 border-gray-500 rounded p-2 w-full" rows={3}
            placeholder="(Optional)"
          />
        </label>
      </div>

      {/* Payer */}
      <div>
        <label>
          Payer
          <select
            value={payerId}
            onChange={(e) => {
              setPayerId(Number(e.target.value))
              console.log(e.target.value)
            }}
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
          {busy ? "Creating…" : "Create Transaction"}
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
