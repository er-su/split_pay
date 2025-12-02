import React, { useEffect, useMemo } from "react";
import type { Due, Member } from "../utils/types";
import { api } from "../utils/api_util";
import { useNavigate } from "react-router-dom";
import ConfirmButton from "../components/ConfirmDialogueButton";


export const DueCard: React.FC<{ due: Due, currency: string; isAdmin: boolean; numberGroupId: number, otherUserId: number, allUserList: Member[], isArchived: boolean }> = ({ due, currency, isAdmin, numberGroupId, otherUserId, allUserList, isArchived }) => {
  function truncateToTwoDecimals(amount: string): string {
    const [intPart, decPart] = amount.split(".");
    return decPart ? `${intPart}.${decPart.slice(0, 2)}` : amount;
  }
  const navigate = useNavigate()
  

  const userMember = useMemo(
    () => allUserList.find((user) => user.user_id === otherUserId),
    [allUserList, otherUserId]
  );

  if (userMember === undefined) {
    navigate("/error", { state: { message: "Your shit broken" } });
  }

  const kickUser = () => {
    try {
      api.deleteGroupMember(numberGroupId, otherUserId);
    } catch (err) {
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    } finally {
      window.location.reload();
    }
  };

  //console.log("userMember", userMember)
  const usernameClasses = (userMember?.left_at === null) ? ("text-3xl m-1") : ("text-3xl m-1 text-red-600")
  return (
    <div className="border-black border bg-white hover:drop-shadow-md hover:bg-gray-50 hover:scale-105 rounded-2xl p-3 text-center transition max-w-3/4 mx-auto m-3">
      <div className={usernameClasses}>{due.other_user_display_name}</div>
      {(userMember?.left_at !== null) && <div className="text-gray-500 mb-2">User has left the group</div>}
      <div className="text-gray-500 mb-2">{truncateToTwoDecimals(due.amount_owed)} {currency}</div>
      {isAdmin && (userMember?.left_at === null) && (!isArchived) && <ConfirmButton buttonText="Kick User" confirmText="Are you sure you wish to remove this user?" onConfirm={kickUser} buttonClassName="bg-red-700 text-white hover:bg-red-800" />}
    </div>
  );
};
