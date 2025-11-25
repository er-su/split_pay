import React from "react";
import type { Member } from "../utils/types";
import { useState } from 'react';
import { api } from "../utils/api_util";
import { MemberCard } from "./MemberCard";



export const MemberList: React.FC<{ Member: Member[],  isAdmin: boolean; numberGroupId:number}> = ({ Member, isAdmin, numberGroupId }) => {
  if (!Member?.length) return <div>No other members yet.</div>;
  return (
    <div>
      {Member.map((Member) => <MemberCard key={Member.user_id} Member={Member} isAdmin={isAdmin} numberGroupId={numberGroupId} />)}
    </div>
  );
};