// src/App.tsx
import { Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./home/index";
import GroupPage from "./group/index";
import TransactionPage from ".//transaction/index";
import InviteJoinPage from "./invites/InviteJoinPage"
import { Loading } from "./components/Loading";

export default function App() {
  return (
    <div>
      <nav style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link to="/">Home</Link>
      </nav>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/group/:id" element={<GroupPage />} />
          <Route path="/transaction/:id" element={<TransactionPage />} />
          <Route path="/groups/join/:token" element={<InviteJoinPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}
