// src/pages/home/index.tsx
import { useEffect, useState } from "react";
import type { Group, User } from "../utils/types";
import { api } from "../utils/api_util";
//import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { GroupList } from "./GroupList";
// import { CreateGroupForm } from "./CreateGroupForm";
import { Link } from "react-router-dom";
import { ArchiveGroupList } from "./ArchiveGroupList";
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
      <br></br>
      <hr></hr> 
      <br></br> 
      {/* <CreateGroupForm onCreated={(g) => setGroups((prev) => (prev ? [g, ...prev] : [g]))} /> */}
       <h1>Archived Groups</h1>
       <ArchiveGroupList groups={groups} me={me} />
       <br></br> 
      <Link to="/groups/new" className="home-link">Create a group</Link>
      <br></br> 
      <br></br> 
			<p>Account Info <br></br>{me?.display_name} {me?.email}</p>
    </div>
  );
}
