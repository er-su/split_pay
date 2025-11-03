import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api_util";
import type { Transaction } from "../utils/types";
import { Loading } from "../components/Loading";
import { SplitList } from "./SplitList";
import { ErrorMessage } from "../components/ErrorMessage";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const txId = Number(id);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTransaction(txId);
        setTx(data);
      } catch (err) {
        setError(err);
      }
    };
    if (txId) load();
  }, [txId]);

  if (!tx) return <Loading />;
  return (
    <div style={{ padding: 20 }}>
      <h1>{tx.title ?? `Transaction #{tx.id}`}</h1>
      <div><strong>Payer:</strong> {tx.total_amount_cents} {tx.currency}</div>      
      <div><strong>Total Amount:</strong> {tx.total_amount_cents} {tx.currency}</div>
      <div><strong>Description:</strong> {tx.memo ?? "No memo"}</div>
      <h2>Splits</h2>
      <SplitList splits={tx.splits} />
      <ErrorMessage error={error} />
    </div>
  );
}
