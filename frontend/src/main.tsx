import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import{   createBrowserRouter, RouterProvider  } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AuthCallback from "./pages/AuthCallback";
import GroupForm from './pages/Groupform.tsx'
import Grouppages from './pages/Grouppages.tsx'

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/auth/callback", element: <AuthCallback />}, 
   { path: "/Groupform/",element:<GroupForm/>
  },
  { path: "/Grouppages/",element:<Grouppages/>
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <RouterProvider router={router} />
  </StrictMode>,
)

