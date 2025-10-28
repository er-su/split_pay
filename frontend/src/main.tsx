import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import{   createBrowserRouter, RouterProvider ,BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AuthCallback from "./pages/AuthCallback";


const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/auth/callback", element: <AuthCallback /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <RouterProvider router={router} />
  </StrictMode>,
//    <StrictMode>



    
//      <BrowserRouter>
//      <Routes>
//       <Route path="/" element={<App />} />
//        <Route path="/auth/callback" element={<AuthCallback />} />
//      </Routes>
//      </BrowserRouter>
//  </StrictMode>,
)

//<Route path="/auth/callback" element={<AuthCallback />} />
//   <Route path="/" element={<App />} />