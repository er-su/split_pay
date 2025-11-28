import React from "react";
import type { Group, User,Member } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api_util";
import { useEffect,useState}   from "react";

type GroupInfo = { group: Group, me: User | null};

 

export const ArchiveGroupCard: React.FC<GroupInfo> = ({ group, me }) => {
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
  if (isArchived === false) {
    return null;
  }

  const startConfirmUnArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setConfirming(true);
    };
  
    const cancelUnarchive = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setConfirming(false);
    };
  
    const confirmUnarchive = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        setBusy(true);
        await api.UnarchiveGroup(group.id);
       // onDeleted?.(tx.id); // parent removes it from the list
       
      } catch (err) {
        console.error("Failed to delete transaction", err);
      } finally {
        setBusy(false);
        setConfirming(false);
        window.location.reload();
      }
    };


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
       {isAdmin && (
        !confirming ? (
          <div className="center">
            
            <button onClick={startConfirmUnArchive}>Unarchive</button>
          </div>
        ) : (
          <div className="center">
            <span>Unarchive?</span>
            <button onClick={confirmUnarchive} disabled={busy}>
              {busy ? "Deleting…" : "Yes"}
            </button>
            <button onClick={cancelUnarchive} disabled={busy}>
              No
            </button>
          </div>
        )
         )}
    </div>
  );
};
