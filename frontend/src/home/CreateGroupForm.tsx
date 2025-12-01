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
    <form onSubmit={submit} className="mb-4 space-y-6 container mx-auto">
      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Name
          <span className="text-red-500 ml-1">*</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="(required)"
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="(optional)"
            className=" mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Base Currency
          <span className="text-red-500 ml-1">*</span>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            required
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full bg-white"
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
        <button
          type="submit"
          disabled={busy} 
          className="w-full bg-blue-950 text-white font-semibold py-2 px-4 rounded-md shadow hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
        >
          {busy ? "Creating…" : "Create group"}
        </button>
      </div>

      {error && <div className="text-red-600 font-medium">{JSON.stringify(error)}</div>}
    </form>
  );
};