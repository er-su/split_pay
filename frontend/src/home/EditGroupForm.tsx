import React, { useEffect, useState } from "react";
import { api, apiFetch } from "../utils/api_util";
import type { Group } from "../utils/types";
import { useNavigate } from "react-router-dom";

type Props = {
  groupId: number;
  onUpdated?: (g: Group) => void;
};

export const EditGroupForm: React.FC<Props> = ({ groupId, onUpdated }) => {
  const nav = useNavigate()
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const cities: string[] = [
    "Bangkok",
    "Paris",
    "London",
    "Dubai",
    "Singapore",
    "New York City",
    "Tokyo",
    "Istanbul",
    "Kuala Lumpur",
    "Seoul",
    "Hong Kong",
    "Barcelona",
    "Amsterdam",
    "Rome",
    "Macau",
    "Las Vegas",
    "Los Angeles",
    "Shanghai",
    "Sydney",
    "Madrid",
    "Vienna",
    "Prague",
    "Miami",
    "Taipei",
    "Chiang Mai",
    "Kyoto",
    "Osaka",
    "Berlin",
    "Munich",
    "Budapest",
    "Lisbon",
    "Toronto",
    "San Francisco",
    "Milan",
    "Venice",
    "Athens",
    "Cancún",
    "Dublin",
    "Marrakesh",
    "Doha",
    "Cairo",
    "Buenos Aires",
    "Johannesburg",
    "Cape Town",
    "Rio de Janeiro",
    "Mexico City",
    "Delhi",
    "Mumbai",
    "Ho Chi Minh City",
    "Hanoi"
  ];

  const filteredCities = cities.filter((c) =>
    c.toLowerCase().includes(destinationQuery.toLowerCase())
  );

  // Load existing group info on mount
  useEffect(() => {
    const load = async () => {
      try {
        const g = await api.getGroup(groupId);
        setName(g.name);
        setDescription(g.description ?? "");
        setBaseCurrency(g.base_currency);
        setDestinationQuery(g.location_name ?? "")
      } catch (err) {
        nav("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
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
          location_name: destinationQuery,
        }),
      });

      onUpdated?.(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const currencies: string[] = [
    "USD", // US Dollar
    "EUR", // Euro
    "JPY", // Japanese Yen
    "GBP", // British Pound
    "AUD", // Australian Dollar
    "CAD", // Canadian Dollar
    "CHF", // Swiss Franc
    "CNY", // Chinese Yuan
    "HKD", // Hong Kong Dollar
    "NZD", // New Zealand Dollar
    "SEK", // Swedish Krona
    "KRW", // South Korean Won
    "SGD", // Singapore Dollar
    "NOK", // Norwegian Krone
    "MXN", // Mexican Peso
    "INR", // Indian Rupee
    "RUB", // Russian Ruble
    "ZAR", // South African Rand
    "TRY", // Turkish Lira
    "BRL", // Brazilian Real
    "TWD", // New Taiwan Dollar
    "DKK", // Danish Krone
    "PLN", // Polish Zloty
    "THB", // Thai Baht
    "IDR", // Indonesian Rupiah
    "HUF", // Hungarian Forint
    "CZK", // Czech Koruna
    "ILS", // Israeli New Shekel
    "AED", // UAE Dirham
    "SAR"  // Saudi Riyal
  ];

 
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


      {/* Destination Field */}
      <div className="flex flex-col relative">
        <label className="text-gray-700 font-medium mb-1">
          Destination
          <input
            type="text"
            value={destinationQuery}
            onChange={(e) => {
              setDestinationQuery(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search for a city..."
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-blue-600 
                       focus:border-blue-600 w-full"
          />
        </label>
          
        {/* Suggestion Dropdown */}
        {showSuggestions && filteredCities.length > 0 && (
          <ul className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
            {filteredCities.map((city) => (
              <li
                key={city}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => {
                  setDestinationQuery(city);
                  setShowSuggestions(false);
                }}
              >
                {city}
              </li>
            ))}
          </ul>
        )}
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
