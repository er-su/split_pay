import { useParams, useNavigate } from "react-router-dom";
import { EditGroupForm } from "../group/EditGroupForm";

export default function EditGroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return <p>Invalid group</p>;

  return (
    <div style={{ padding: 20 }}>
      <EditGroupForm
        groupId={Number(id)}
        onUpdated={() => {
          alert("Group updated!");
          navigate(`/group/${id}`, { state: { refreshGroup: true } });
        }}
      />
    </div>
  );
}
