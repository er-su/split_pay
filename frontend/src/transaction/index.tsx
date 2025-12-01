import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api_util";
import type { Transaction, User } from "../utils/types";
import { Loading } from "../components/Loading";
import { SplitList } from "./SplitList";
import { ErrorMessage } from "../components/ErrorMessage";

import "./index.css"
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
  return (
      <div className="dues-card">
      <h1>{tx.title ?? `Transaction #{tx.id}`}</h1>
      <div><strong>Payer:</strong> {payer_display_name}</div>      
      <div><strong>Total Amount:</strong> {truncateToTwoDecimals(tx.total_amount_cents)} {tx.currency}</div>
      <div><strong>Description:</strong> {tx.memo ?? "No memo"}</div>
      <br></br>
      <hr></hr>
      <br></br>
      <h2>Splits</h2>
      <SplitList splits={tx.splits} me={me} payer_display_name={payer_display_name} />
      <ErrorMessage error={error} />
      
    </div>
  );
}
