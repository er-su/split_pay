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
  console.log("In edit form component")
  return (
    <form onSubmit={submit} className="mb-4 space-y-6 container mx-auto">
      <h2>Edit Group</h2>

      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="ml-2 mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="ml-2 mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Base Currency
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="ml-2 mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full bg-white"
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
        <button type="submit" disabled={busy}
          className="w-full bg-blue-950 text-white font-semibold py-2 px-4 rounded-md shadow hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && <div className="text-red-600 font-medium">{JSON.stringify(error)}</div>}
    </form>
  );
};
