import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api_util";
import type { Transaction, User } from "../utils/types";
import { Loading } from "../components/Loading";
import { SplitList } from "./SplitList";
import { ErrorMessage } from "../components/ErrorMessage";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const txId = Number(id);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<any>(null);

  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }
  

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.getMe()
        const data = await api.getTransaction(txId);
        setTx(data);
        if (me === null) {
          return (<ErrorMessage error={"Unable to get user. Fatal error"}/>)
        }
        setMe(me)
      } catch (err) {
        setError(err);
      }
    };
    if (txId) load();
  }, [txId]);

  if (!tx) return <Loading />;
  
    
  const payer_display_name = tx.payer_id === me?.id ? "You" : tx.payer_display_name
  const money_color = (tx.payer_id === me?.id) ? ("text-green-700") : ("text-red-700")
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-12 px-4">
      <div className="w-full h-fit max-w-3xl bg-white shadow-lg rounded-2xl p-8 space-y-8">
      
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900">
          {tx.title ?? `Transaction #${tx.id}`}
        </h1>
      
        {/* Info Section */}
        <div className="grid md:grid-cols-2 gap-6">
      
          <div className="bg-gray-50 rounded-xl p-4 border">
            <p className="text-sm text-gray-500 font-medium">Payer</p>
            <p className="text-lg font-semibold text-gray-800">
              {payer_display_name}
            </p>
          </div>
      
          <div className="bg-gray-50 rounded-xl p-4 border">
            <p className="text-sm text-gray-500 font-medium">Total Amount Owed</p>
            <p className={`text-lg font-semibold ${money_color}`}>
              {truncateToTwoDecimals(tx.total_amount_cents)} {tx.currency}
            </p>
          </div>
      
          <div className="bg-gray-50 rounded-xl p-4 border md:col-span-2">
            <p className="text-sm text-gray-500 font-medium">Description</p>
            <p className="text-gray-700">
              {tx.memo ?? "No memo"}
            </p>
          </div>
        </div>
      
        {/* Splits Section */}
        <div className="pt-4 border-t">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Splits</h2>
          <SplitList
            splits={tx.splits}
            me={me}
            payer_display_name={payer_display_name}
          />
        </div>
      
        <ErrorMessage error={error} />
      </div>
    </div>
  );
}
