import React, { useEffect, useState } from "react";
import { api, apiFetch } from "../utils/api_util";
import type { Group } from "../utils/types";

type Props = {
  groupId: number;
  onUpdated?: (g: Group) => void;
};

export const EditGroupForm: React.FC<Props> = ({ groupId, onUpdated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);

  // Load existing group info on mount
  useEffect(() => {
    const load = async () => {
      try {
        const g = await api.getGroup(groupId);
        setName(g.name);
        setDescription(g.description ?? "");
        setBaseCurrency(g.base_currency);
      } catch (err) {
        setError(err);
      }
    };
    load();
  }, [groupId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const updated = await apiFetch(`/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          base_currency: baseCurrency,
        }),
      });

      onUpdated?.(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const currencies = [
    "USD", "EUR", "GBP", "JPY", "CAD",
    "AUD", "CHF", "CNY", "HKD", "INR",
    "KRW", "SGD", "MXN", "BRL", "ZAR"
  ];

  return (
    <form onSubmit={submit} style={{ marginBottom: 16 }}>
      <h2>Edit Group</h2>

      <div>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      <div>
        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      <div>
        <label>
          Base Currency
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            style={{ marginLeft: 8 }}
            required
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && <div style={{ color: "red" }}>{JSON.stringify(error)}</div>}
    </form>
  );
};
