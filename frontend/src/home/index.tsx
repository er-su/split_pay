// src/pages/home/index.tsx
import { useEffect, useState } from "react";
import type { Group, User } from "../utils/types";
import { api } from "../utils/api_util";
//import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { GroupList } from "./GroupList";
// import { CreateGroupForm } from "./CreateGroupForm";
import { Link, useNavigate } from "react-router-dom";
import { ArchiveGroupList } from "./ArchiveGroupList";
import CalculatorWidget from "../components/CalculatorWidget";
import ErrorPage from "../pages/ErrorPage";
export default function HomePage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.listGroups();
      const me = await api.getMe();
      setGroups(data);
      setMe(me);
    } catch (err) {
      
      navigate("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="relative min-h-screen p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-sans mb-6 text-center pb-5">
          {me?.display_name}'s Groups
        </h1>
        <div className="h-1 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded"></div>
      </div>
      {error && groups !== null && (
        <ErrorPage
          message={
            error instanceof Error
            ? error.message
            : typeof error === "string"
            ? error
            : JSON.stringify(error)
          }
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ">
        <div className="border p-10 rounded-4xl bg-blue-100 w-11/12 mx-auto">
          <h2 className="text-2xl font-semibold mt-1 mb-1 text-center">Your Groups</h2>
          <div className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-5"></div>
          <GroupList groups={groups} me={me} />
        </div>

        <div className="border p-10 rounded-4xl bg-blue-100 w-11/12 mx-auto">
          <h2 className="text-2xl font-semibold mt-1 mb-1 text-center">Archived Groups</h2>
          <div className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-5"></div>
          <ArchiveGroupList groups={groups} me={me} />
        </div>
      </div>
      <Link
        to="/groups/new"
        className="
          absolute bottom-20 left-6 
          bg-blue-600 text-white 
          px-5 py-3 rounded-xl shadow-lg 
          hover:bg-blue-700 transition
        "     
      >
        Create a group
      </Link>
    </div>
  );
}
