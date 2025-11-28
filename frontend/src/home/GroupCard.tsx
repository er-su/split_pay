import React from "react";
import type { Group, User,Member } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { api,apiFetch } from "../utils/api_util";
import { useEffect,useState}   from "react";

type GroupInfo = { group: Group, me: User | null};

 

export const GroupCard: React.FC<GroupInfo> = ({ group, me }) => {
  const nav = useNavigate();
  const creator_name = me?.id == group.created_by ? "You" : group.creator_display_name
  const goToEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 👈 prevent card's onClick from firing
    nav(`/group/${group.id}/edit`);
  };
  const [isArchived, setIsArchived] = useState<boolean | null>(null);
const [confirming, setConfirming] = useState(false);
     const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
    const [Me, setMe] = useState<User | null>(null);
const [isAdmin, setIsAdmin] = useState(false);


  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
       
        if (!cancelled) {
          setIsArchived(group.is_archived);
        const [ meRes, membersRes] = await Promise.all([
       
        
        api.getMe(),
        api.fetchGroupMembers(group.id),
      ]);

  const membership = membersRes.find((m) => m.user_id === meRes.id);
  setIsAdmin(!!membership?.is_admin);

        }
      } catch (err) {
        console.error("Failed to fetch archive status", err);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [group.id]);

  // 🔴 If archived, don't render anything
  if (isArchived === true) {
    return null;
  }

  const startConfirmArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setConfirming(true);
    };
  
    const cancelArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setConfirming(false);
    };
  
    const confirmArchive = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        setBusy(true);
        await api.ArchiveGroup(group.id);
       // onDeleted?.(tx.id); // parent removes it from the list
       
      } catch (err) {
        console.error("Failed to delete transaction", err);
      } finally {
        setBusy(false);
        setConfirming(false);
        window.location.reload();
      }
    };

   const handleDeleteGroup = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!group.id) return;
  
      const confirmed = window.confirm("Are you sure you want to delete this group?");
      if (!confirmed) return;
  
      try {
        await apiFetch(`/groups/${group.id}`, { method: "DELETE" });
        alert("Group deleted successfully.");
       
      } catch (err) {
        console.error("Failed to delete group:", err);
        alert("Could not delete group.");
      }
      finally{
        window.location.reload();
      }
    };


    const handleEdit = async (e: React.MouseEvent<HTMLButtonElement>) =>{
        e.stopPropagation();
        nav(`/group/${group.id}/edit`)
    }

  return (
   
   
   
    <div 
      onClick={() => nav(`/group/${group.id}`)}
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        cursor: "pointer",
        marginBottom: 8,
      }}
    
    >
      <div style={{ fontWeight: 700 }}>{group.name}</div>
      <div style={{ fontSize: 13, color: "#666" }}>Created by {creator_name} </div>
      <div style={{ fontSize: 13, color: "#666" }}>{group.base_currency}</div>
      <div style={{ fontSize: 13, color: "#666" }}>{group.description ? group.description : "No description"}</div>
     {/* <button onClick={goToEdit}>Edit</button> */}
      <div className="center">
       {isAdmin && (
        !confirming ? (
          <div className="center">
            {/* <button onClick={goToEdit}>Edit</button> */}
            <button onClick={startConfirmArchive}>Archive</button>
          </div>
        ) : (
          <div className="center">
            <span>Archive?</span>
            <button onClick={confirmArchive} disabled={busy}>
              {busy ? "Deleting…" : "Yes"}
            </button>
            <button onClick={cancelArchive} disabled={busy}>
              No
            </button>
          </div>
        )
         )}
        </div>
  
      
      {/* Edit Group Button */}
      {isAdmin && (
        <button
          onClick={handleEdit}
          
      >
      Edit Group
      </button>
      )}

      <div className="center">
      {/* Delete Group Button */}
      {isAdmin && (
        <button
          onClick={handleDeleteGroup}
          
        >
          Delete Group
        </button>
      )}
    </div>
    </div>

  
    
  );
};

