import React from "react";
import type { Due } from "../utils/types";


export const DueCard: React.FC<{ due: Due, currency: string;isAdmin:boolean;numberGroupId:number}> = ({ due, currency,isAdmin,numberGroupId}) => {
  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }



  return (
    <div style={{ border: "1px solid #eee", padding: 8, marginBottom: 8, borderRadius: 6, cursor: "pointer" }}>
      <div style={{ fontWeight: 600 }}>{due.other_user_display_name}</div>
      <div style={{ color: "#666" }}>{truncateToTwoDecimals(due.amount_owed)} {currency}</div>
    {/* Only show buttons if user is admin OR creator */}
      
   
    
    
    </div>

    
    

  );
};
