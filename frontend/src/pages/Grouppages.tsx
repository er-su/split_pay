import api from '../api';
import { useEffect, useState } from 'react';
export default function Gotogrouppages() 
{
  const [groups, Setgroups] = useState([]);
  const Getgroups = async () => {
    try {
      const res = await api.get('/me/groups');
      console.log("User data:", res.data);
      Setgroups(res.data);
    } 
    catch (error: any) 
    {
    console.error("User not authenticated");
    return null;
    }
    };
  useEffect(() => {
    Getgroups();
  }, []);

   return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {groups.map((group: any) => (
        <div 
          key={group.id} 
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            borderRadius: "8px",
            width: "200px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3>{group.name}</h3>
        </div>
      ))}
    </div>
  );
};












