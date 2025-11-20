import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateGroupForm } from "../home/CreateGroupForm";

export const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <h1>Create a New Group</h1>

      <CreateGroupForm
        onCreated={(group) => {
          // redirect after creation (optional)
          navigate(`/`);
        }}
      />
    </div>
  );
};
