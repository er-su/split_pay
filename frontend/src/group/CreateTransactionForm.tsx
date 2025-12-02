import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import React, { useEffect, useState } from "react";
import { api } from "../utils/api_util";
import { type Member, type Transaction, type User } from "../utils/types";
import { MultiSelect } from "@/components/MultiSelect";
import CalculatorWidget from "@/components/CalculatorWidget";
import { useNavigate } from "react-router-dom";
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
  const [totalAmt, setTotalAmt] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [splits, setSplits] = useState<SplitInput[]>([
    { user_id: -1, amount_cents: "", note: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const navigate = useNavigate();
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

  const calculateEvenSplit = (usersSelected: number[], amountToSplit: string, userNote: string) => {
    if (usersSelected.length === 0) {
      setSplits([...splits, { user_id: -1, amount_cents: "", note: "" }]);
    }
    const numAmountToSplit = Number(amountToSplit)
    const perUser = numAmountToSplit / (usersSelected.length + 1)
    const newSplits: SplitInput[] = usersSelected.map<SplitInput>((user: number) => ({
      user_id: Number(user),
      amount_cents: perUser.toString(),
      note: userNote || undefined,
    }))
    return newSplits

  }

  // --- Submit form ---
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    console.log(splits)

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
      setTotalAmt("");
      setSplits([{ user_id: -1, amount_cents: "", note: "" }]);
      setSelectedUsers([])
    } catch (err: any) {
      setError(err);
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    } finally {
      setBusy(false);
    }
  };

  // --- Render ---
  return (
    <>
    <CalculatorWidget />
    <form onSubmit={submit} className="container mx-auto space-y-6">
      <h1 className="text-4xl text-green-900 font-bold text-center">Create Transaction</h1>

      {/* Title */}
      <div className="flex flex-col">
        <label className="text-gray-700 font-medium mb-1">
          Title
          <span className="text-red-500 ml-1">*</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="(required)"
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
            placeholder="(optional)"
            className=" mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
          />
        </label>
      </div>

      {/* Payer */}
      <div className="flex flex-col w-full">
        <label className="text-gray-700 font-medium mb-1">
          Payer
          <span className="text-red-500 ml-1">*</span>
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
          <span className="text-red-500 ml-1">*</span>
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
        <Tabs defaultValue="custom" className="w-full bg-white rounded-xl shadow-sm border-gray-300 border p-3 hover:border-gray-400 transition"
          onValueChange={(value) => {
            setTotalAmt("");
            setSplits([{ user_id: -1, amount_cents: "", note: "" }]);
            setSelectedUsers([])
          }}
        >
          <TabsList>
            <TabsTrigger value="custom" className="flex-1 text-center py-2 font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:text-blue-800 data-[state=active]:shadow-md rounded-lg transition" >Custom Splits</TabsTrigger>
            <TabsTrigger value="even" className="flex-1 text-center py-2 font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:text-blue-800 data-[state=active]:shadow-md rounded-lg transition">Even Splits</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="bg-white p-4 rounded-xl border-gray-300 border space-y-4">
            <h4 className="text-lg font-semibold text-gray-600 mb-4">Custom Splits</h4>
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
          </TabsContent>

          {/* Other split method */}
          <TabsContent value="even" className="bg-white p-4 rounded-xl border-gray-300 border space-y-4">
            <h4 className="text-lg font-semibold text-gray-600 mb-4">Even Splits</h4>
            <div className="flex flex-col md:flex-row items-center gap-3">
              <label className="flex-1 flex flex-col text-gray-700 font-medium w-3/4">
                Total Amount
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={totalAmt}
                  onChange={(e) =>{
                    setTotalAmt(e.target.value)
                    console.log(e.target.value)
                    console.log(selectedUsers.length)
                    const newSplits = calculateEvenSplit(selectedUsers, e.target.value, "hi")
                    setSplits(newSplits)
                    console.log(splits)
                  }}
                  required
                  className="border-gray-500 border rounded-md p-2 mr-5" 
                />
              </label>
              <div className="flex flex-col md:flex-row items-center gap-3 pt-5 w-full">
                <h4>Select Users</h4>
                <MultiSelect
                  options={members
                    .filter((m) => m.user_id !== payerId)
                    .map((m) => ({
                      value: m.user_id,
                      label: m.display_name || `User ${m.user_id}`,
                    }))
                  }
                  selected={selectedUsers}
                  onChange={(vals) => {
                    setSelectedUsers(vals);
                    const newSplits = calculateEvenSplit(vals, totalAmt, "hi")
                    setSplits(newSplits)
                  }}
                  placeholder="Select Users"
                />
              </div>
            </div>
            <div>
              {(totalAmt !== "") && (selectedUsers.length > 0) && (payerId !== "" ) && (<p className="text-gray-700"> Splitting {totalAmt} {currency} among {selectedUsers.length + 1} people </p>)}
            </div>
          </TabsContent>
        </Tabs>
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
        {busy ? "Creating…" : "Create Transaction"}
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
