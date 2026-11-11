import { Outlet } from "@tanstack/react-router";
import LeagueBar from "./LeagueBar";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <LeagueBar />
      <main className="page py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
