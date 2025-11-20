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
import "./App.css"
export default function App() {
  return (
    <div>
      <nav style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link to="/" className="home-link">Home</Link>
        <LogoutButton />
      </nav>
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
        </Routes>
      </Suspense>
    </div>
  );
}
