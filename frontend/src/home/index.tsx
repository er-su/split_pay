// src/pages/home/index.tsx
import { useEffect, useState } from "react";
import type { Group, User } from "../utils/types";
import { api } from "../utils/api_util";
//import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { GroupList } from "./GroupList";
// import { CreateGroupForm } from "./CreateGroupForm";
import { Link } from "react-router-dom";

export default function HomePage() {
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
      setError(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Your groups</h1>
      {error &&  groups !== null && (
        <ErrorMessage
          error={
            error instanceof Error
              ? error.message
              : typeof error === "string"
              ? error
              : JSON.stringify(error)
          }
        />
      )}
      {groups === null ? <p>Create some groups!</p> : <GroupList groups={groups} me={me} />}   
      {/* <CreateGroupForm onCreated={(g) => setGroups((prev) => (prev ? [g, ...prev] : [g]))} /> */}
      <Link to="/groups/new">Create a group</Link>
			<p>Info on you {me?.display_name} {me?.email}</p>
    </div>
  );
}
