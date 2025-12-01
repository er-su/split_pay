import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "./LogoutButton";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col ">

      {/* --- Top Banner --- */}
      <header
        className="
          w-full
          text-white
          px-4 py-3
          flex items-center justify-between
          border-b border-black
          rounded-b-4xl
          bg-blue-950
        "
      >
        {/* Home Button - Left */}
        <button
          className="text-lg font-semibold bg-blue-950 hover:bg-gray-100 hover:text-blue-950 text-white transition p-3 rounded-3xl border-white border"
          onClick={() => navigate("/")}
        >
          Home
        </button>

        {/* Center Title */}
        <h1 className="text-4xl font-semibold font-mono absolute left-1/2 -translate-x-1/2">
          SPLIT PAY
        </h1>

        {/* Logout Button - Right */}
        <div className="text-lg font-semibold bg-blue-950 hover:bg-gray-100 hover:text-blue-950 text-white transition p-3 rounded-3xl border-white border">
          <LogoutButton />
        </div>
      </header>

      {/* --- Page Content --- */}
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}

