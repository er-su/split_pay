import React from "react";
import type { Group, User, Member } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { api, apiFetch } from "../utils/api_util";
import { useEffect, useState } from "react";
import ConfirmButton from "../components/ConfirmDialogueButton";

type GroupInfo = { group: Group, me: User | null };



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
          const [meRes, membersRes] = await Promise.all([


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

  const handleArchiveGroup = async () => {
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
  }

  const handleDeleteGroup = async () => {
    //e.stopPropagation();
    if (!group.id) return;

    try {
      await apiFetch(`/groups/${group.id}`, { method: "DELETE" });

    } catch (err) {
      console.error("Failed to delete group:", err);
      alert("Could not delete group.");
    }
    finally {
      window.location.reload();
    }
  };


  const handleEdit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    nav(`/group/${group.id}/edit`)
  }



  return (
    <div
      onClick={() => nav(`/group/${group.id}`)}
      className="border border-black p-4 rounded-xl cursor-pointer mb-3 shadow-sm hover:shadow-xl transition bg-white w-3/4 mx-auto hover:scale-105"
    >

      <div className="text-2xl font-bold text-center text-gray-900 mb-2 underline decoration-teal-900">{group.name}</div>
      <div className="flex flex-col items-center text-sm text-gray-500 mb-4">
        <div className="flex items-center">
          Created by {creator_name}
        </div>
        <div className="flex items-center">
          Currency: {group.base_currency}
        </div>
      </div>
      <div className="text-md text-black border-t border-gray-200 pt-3 mt-2">Description: {group.description ? group.description : "No description"}</div>
      {/* <button onClick={goToEdit}>Edit</button> */}
      <div className="border-t pt-3 mt-3 flex flex-wrap gap-3">
        {isAdmin && <ConfirmButton 
          buttonClassName="flex-1 bg-blue-900 hover:bg-blue-950 transition text-white text-center"
          buttonText="Archive"
          confirmText="Are you sure you wish to archive this group? This prevents any further modifications to the group."
          onConfirm={(e: React.MouseEvent<HTMLButtonElement>) => {
            e?.stopPropagation()
            handleArchiveGroup()
          }}
        />}
  
        
        {/* Edit Group Button */}
        {isAdmin && (
          <button
            onClick={handleEdit}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 transition text-white"
          >
            
            Edit Group
          </button>
        )}
  
          {/* Delete Group Button */}
        {isAdmin && (
          <ConfirmButton
            buttonClassName="flex-1 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white transition"
            buttonText="Delete"
            confirmText="Are you sure you want to delete this group? This is NOT reversable!"
            onConfirm={(e: React.MouseEvent<HTMLButtonElement>) => {
              e?.stopPropagation()
              handleDeleteGroup()
            }}
          />
        )}
      </div>
    </div>
  );
};

