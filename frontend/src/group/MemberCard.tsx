import React from "react";
import type { Due ,Member } from "../utils/types";
import { useState } from 'react';
import { api } from "../utils/api_util";



export const MemberCard: React.FC<{ Member: Member,isAdmin:boolean;numberGroupId:number,isArchived: boolean }> = ({ Member, isAdmin,numberGroupId,isArchived }) => {

const [confirming, setConfirming] = useState(false);
     const [busy, setBusy] = useState(false);
const startConfirmDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const cancelDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const confirmDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      setBusy(true);
      //await api.deleteTransaction(tx.id);
     // onDeleted?.(tx.id); // parent removes it from the list
     await api.deleteGroupMember(numberGroupId,Member.user_id);
    } catch (err) {
      console.error("Failed to delete transaction", err);
    } finally {
      setBusy(false);
      setConfirming(false);
       window.location.reload();
    }
  };
const canEditOrDelete=isAdmin && !isArchived;
const memberAdmin=Member.is_admin;

return(

     <div style={{ border: "1px solid #eee", padding: 8, marginBottom: 8, borderRadius: 6, cursor: "pointer" }}>
      <div style={{ fontWeight: 600 }}>{Member.display_name}</div>



        {/* Only show buttons if user is admin OR creator */}
      {canEditOrDelete && !memberAdmin && (
        !confirming ?  (
          <div className="center">
            {/* <button onClick={goToEdit}>Edit</button> button to edit or delete */}
            <button onClick={startConfirmDelete}>Delete</button>
          </div>
        ) : (
          <div className="center">
            <span>Delete?</span>
            <button onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Yes"}
            </button>
            <button onClick={cancelDelete} disabled={busy}>
              No
            </button>
          </div>
        )
      )}
    
    
    </div>
)
}