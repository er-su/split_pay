import React, { useState } from 'react';
import api from './api';




const GoogleLogin = async () => {
  try {
    console.log("hey i got into this api");
    const response = await api.get('/api/auth/google/login');
    console.log("hey icalled the api already");
    const loginUrl = response.data.auth_url;
    console.log(loginUrl);
    window.location.href = loginUrl; // Full redirect
    //window.open(loginUrl, "_blank");// opens a new window
  } catch (error) {
    console.error("Error fetching Google Login", error);
  }
}; export default GoogleLogin