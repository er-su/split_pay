import React, { useState } from 'react';
import api from '../api';


 export const getGroups = async () => {
  try {
    const res = await api.get('/me/groups');
    console.log("User data:", res.data);
    return res.data;
  } catch (error: any) {
    console.error("User not authenticated");
    return null;
  }
}; 













