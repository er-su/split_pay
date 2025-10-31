import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import{   createBrowserRouter, RouterProvider  } from 'react-router-dom'
import './index.css'
import App from './home/App.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import GroupForm from './pages/Groupform.tsx'
import GroupEditing from './pages/Groupediting.tsx'
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
)

