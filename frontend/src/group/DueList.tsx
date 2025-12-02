import React, { useEffect, useState } from "react";
import type {  Due, Member } from "../utils/types";
import { DueCard } from "./DueCard";
import { api, apiFetch } from "../utils/api_util";
import { useNavigate } from "react-router-dom";

export const DueList: React.FC<{ dues: Due[], currency: string;  isAdmin: boolean; numberGroupId:number, isArchived: boolean}> = ({ dues, currency,isAdmin, numberGroupId, isArchived}) => {
  const navigate = useNavigate()
  const [allGroupMemberInfo, setAllGroupMemberInfo] = useState<Member[]>([])
  
  useEffect(() => {
    if (!numberGroupId) return;
    try {
      api.fetchAllGroupMembers(numberGroupId).then((res) => {
        setAllGroupMemberInfo(res);
      });
      
    } catch(err) {
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    } 

  }, [numberGroupId]);
  if (!dues?.length) return <div>No other members yet.</div>;
  return (
    <div>
      {dues.map((due) => <DueCard key={due.other_user_id} due={due} currency={currency} isAdmin={isAdmin} numberGroupId={numberGroupId} otherUserId={due.other_user_id} allUserList={allGroupMemberInfo} isArchived={isArchived}/>)}
    </div>
  );
};

