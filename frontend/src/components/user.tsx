import React, { useState } from 'react';
import api from '../api';




// const GoogleLogin = async () => {
//   try {
//     console.log("hey i got into this api");
//     const response = await api.get('/api/auth/google/login');
//     console.log("hey icalled the api already");
//     const loginUrl = response.data.auth_url;
//     console.log(loginUrl);
//     window.location.href = loginUrl; // Full redirect
//     //window.open(loginUrl, "_blank");// opens a new window
//   } catch (error) {
//     console.error("Error fetching Google Login", error);
//   }
// };

// const getMe = async () => {
//   try {
//     var x=15;
//     const res = await api.get('/me/');
//     return res.data;
//   } catch (error: any) {
//     console.error("authentication error");
//     GoogleAuthButton();
//     // if (error.response?.status === 401) {
//     //   console.error("Authentication required");
//     //   GoogleLogin
//     //   // For example: redirect to login page
//     //   // navigate("/login");
//     // } else {
//     //   console.error("Error fetching groups", error);
//     // }
//     // throw error; // optional: rethrow if needed upstream
//   }
// };export default getMe
// src/components/user.ts
const getMe = async () => {
  try {
    const res = await api.get('/me');
    console.log("User data:", res.data);
    return res.data;
  } catch (error: any) {
    console.error("User not authenticated");
    return null;
  }
};

export default getMe;



const getUsergroups=async(data:any)=>{
try
{
    await api.get('/groups/',{data})
}
catch(Error)
{
    console.error("Error adding Group",Error)
}
}

