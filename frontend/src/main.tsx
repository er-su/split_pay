/* import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import{   createBrowserRouter, RouterProvider  } from 'react-router-dom'
import './index.css'
import App from './home/App.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import GroupForm from './pages/Groupform.tsx'
import GroupEditing from './pages/GroupEditing.tsx'
import Grouptrans from './group/groupTrans.tsx'
const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/auth/callback", element: <AuthCallback />}, 
   { path: "/Groupform/",element:<GroupForm/>
  },
  { path: "/GroupTransaction/",element:<Grouptrans/>
  },
  { path: "/GroupEditing/",element:<GroupEditing/>
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <RouterProvider router={router} />
  </StrictMode>,
) */

// new main below

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
//import "./index.css";

import "./tailwind.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
