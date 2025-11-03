// src/pages/home/CreateGroupForm.tsx
import React, { useState } from "react";
import { api } from "../utils/api_util";
import type { Group } from "../utils/types";

type Props = { onCreated?: (g: Group) => void };

export const CreateGroupForm: React.FC<Props> = ({ onCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.createGroup({
        name,
        description,
        base_currency: baseCurrency,
      });
      setName("");
      setDescription("");
      setBaseCurrency("USD");
      onCreated?.(created);
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
          {busy ? "Creating…" : "Create group"}
        </button>
      </div>

      {error && <div style={{ color: "red" }}>{JSON.stringify(error)}</div>}
    </form>
  );
};