import{ useState } from 'react';
import api from '../components/api';
import Homepage from '../components/Navigatebacktoapp';

import { useNavigate } from 'react-router-dom';

const GroupForm = () => {
const navigate = useNavigate();
const handleGoBack = () => {
    navigate("/"); // or navigate(-1)
  };
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_currency: "USD",
    location_name: "",
    location_lat: "",
    location_lon: "",
  });

  const handleChange =   (e:any) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    try {
      const response = await api.post(
        "/groups", // replace with your API URL
        formData,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Success:", response.data);
      
    } catch (error) {
      console.error("❌ Error:", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "300px",
      }}
    >
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
      />
      <input
        type="text"
        name="location_name"
        placeholder="Location Name"
        value={formData.location_name}
        onChange={handleChange}
      />
      <input
        type="text"
        name="location_lat"
        placeholder="Latitude"
        value={formData.location_lat}
        onChange={handleChange}
      />
      <input
        type="text"
        name="location_lon"
        placeholder="Longitude"
        value={formData.location_lon}
        onChange={handleChange}
      />
            <button type="submit">Submit</button>

      {/* Optional: separate button to go back without submitting */}
      <button type="button" onClick={handleGoBack}>
        Go back to the app
      </button>
    </form>
  );
};

export default GroupForm;














