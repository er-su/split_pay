import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import api from '../components/api';
import GoogleLogin from '../components/googleLogin';
import { useEffect } from 'react';
import { useLocation } from "react-router-dom";

export default function ListTransactions(groupid:any){



    const [Transactions,setTransactions ] = useState([]);
  const Gettransactions = async () => {
    try {
      const res = await api.get(`/groups/${groupid}/transactions`)

      console.log("User data:", res.data);
      setTransactions(res.data);
    } 
    catch (error: any) 
    {
    console.error("User not authenticated");
    GoogleLogin()
    return null;
    }
    };
  useEffect(() => {
    Gettransactions();
  }, []);

   return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {Transactions.map((Transaction: any) => (
        <div 
          key={Transaction.id} 
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            borderRadius: "8px",
            width: "200px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3>{Transaction.title} : {Transaction.total_amount_cents}</h3>
        </div>
      ))}
     
    </div>
    
  );

}





