// src/pages/home/index.tsx
import { useEffect, useState } from "react";
import type { Group } from "../utils/types";
import { api } from "../utils/api_util";
import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { GroupList } from "./GroupList";
import { CreateGroupForm } from "./CreateGroupForm";

export default function HomePage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.listGroups();
      setGroups(data);
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
      <CreateGroupForm onCreated={(g) => setGroups((prev) => (prev ? [g, ...prev] : [g]))} />
      {groups === null ? <Loading /> : <GroupList groups={groups} />}
      <ErrorMessage error={error} />
    </div>
  );
}
