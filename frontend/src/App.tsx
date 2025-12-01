// src/App.tsx
import { Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./home/index";
import GroupPage from "./group/index";
import TransactionPage from ".//transaction/index";
import InviteJoinPage from "./invites/InviteJoinPage"
import { Loading } from "./components/Loading";
import { LogoutButton } from "./components/LogoutButton";
import CreateTransactionPage from "./pages/CreateTransactionPage";
import EditTransactionPage from "./pages/EditTransactionPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import EditGroupPage from "./pages/EditGroupPage";
//import "./App.css"
import AppLayout from "./components/AppOverlay";
import ErrorPage from "./pages/ErrorPage";
export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/group/:id" element={<GroupPage />} />
          <Route path="/transaction/:id" element={<TransactionPage />} />
          <Route path="/groups/join/:token" element={<InviteJoinPage />} />
          <Route
            path="/group/:groupId/transactions/new"
            element={<CreateTransactionPage />}
          />
          {/* edit transaction */}
          <Route
            path="/transaction/:id/edit"
            element={<EditTransactionPage />}
          />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/group/:id/edit" element={<EditGroupPage />} />
          <Route path="/error" element={<ErrorPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
