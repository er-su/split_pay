

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
          <h3>{group.name} {group.base_currency}</h3>
        </div>
      ))}
      <button onClick={AddGroupForm}>Create A group</button>
    </div>
    
  );
 
 
}

export default App
