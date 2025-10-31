

// import './App.css'
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import api from '../components/api';
import GoogleLogin from '../components/googleLogin';
import { useEffect } from 'react';


function App() {
const navigate = useNavigate();
const AddGroupForm = () => {
     navigate("/Groupform");
   };

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
    GoogleLogin()
    return null;
    }
    };
  useEffect(() => {
    Getgroups();
  }, []);
  
  const Deletegroups = async (Id_Group:number) => {
    try {
      console.log(Id_Group)
      await api.delete(`/groups/${Id_Group}`, {
  params: { hard: true }});
    Setgroups(prevGroups => prevGroups.filter((g: any)=> g.id !== Id_Group));
    }
    catch (error: any) 
    {
    console.error("User not authenticated");
    GoogleLogin()
    return null;
    }
    };



   return (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {groups.map((group:any) => (
        <div
          key={group.id}
          style={{
            position: "relative", // 🔹 allows absolute positioning inside
            border: "1px solid #ccc",
            padding: "10px 10px 20px 10px",
            borderRadius: "8px",
            width: "200px",
            backgroundColor: "#f9f9f9",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          {/* ❌ DELETE BUTTON */}
          <button
            onClick={() => Deletegroups(group.id)}
            style={{
              position: "absolute",
              top: "5px",
              right: "8px",
              background: "transparent",
              border: "none",
              color: "#888",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: "1",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "red")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            title="Delete Group"
          >
            ×
          </button>

          {/* Group Descrition */}
          <h3 style={{ marginTop: "20px" }}>
            {group.name} : {group.base_currency}
          </h3>


            {/* Group Transactions Page*/}
          <button
            onClick={() =>
              navigate("/GroupTransaction", { state: { groupId: group.id } })
            }
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#007bff",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Go to Transactions
          </button>

          <button
            onClick={() => navigate("/GroupEditing", { state: { groupId: group.id } })}
            style={{ 
              position: "absolute",
              top: "5px",
              left: "8px",
              background: "transparent",
              border: "none",
              color: "#888",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: "1",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "red")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            title="Delete Group"
          >
            Editing
          </button>
        </div>
      ))}
      <button onClick={AddGroupForm}> Create A group</button>
    </div>
  
    
   
    
  );
 
 
}

export default App
