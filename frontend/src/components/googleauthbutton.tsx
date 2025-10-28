import React, { useState } from 'react';
import api from '../api';
const GoogleAuthButton = () => {
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);

  const fetchGoogleLoginUrl = async () => {
    try {
      const res = await api.get("/api/auth/google/login");
      setGoogleUrl(res.data.auth_url);
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  return (
    <div>
      {!googleUrl ? (
        <button onClick={fetchGoogleLoginUrl}>
          Get Google Login Link
        </button>
      ) : (
        <a href={googleUrl}>
          <button>Login With Google</button>
        </a>
      )}
    </div>
  );
}; export default GoogleAuthButton
