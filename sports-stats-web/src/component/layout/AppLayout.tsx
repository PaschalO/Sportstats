import { Outlet } from "@tanstack/react-router";

import Navbar from "./Navbar";
import LeagueNavbar from "./LeagueNabar";
import SectionNavbar from "./SectionNavbar";

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <LeagueNavbar />
            <SectionNavbar />

            <main className="page py-8">
                <Outlet />
            </main>
        </div>
    );
}