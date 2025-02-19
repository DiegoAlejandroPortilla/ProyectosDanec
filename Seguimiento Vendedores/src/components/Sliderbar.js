import React from "react";
import { Home, Users, ShoppingCart } from "lucide-react";

const Sidebar = () => {
  return (
    <aside className="w-64 bg-indigo-600 text-white p-5 h-screen">
      <h2 className="text-lg font-bold mb-5">Argon Dashboard</h2>
      <nav className="flex flex-col gap-3">
        <button className="flex items-center gap-2 p-2 hover:bg-indigo-700 rounded">
          <Home /> Dashboards
        </button>
        <button className="flex items-center gap-2 p-2 hover:bg-indigo-700 rounded">
          <Users /> Users
        </button>
        <button className="flex items-center gap-2 p-2 hover:bg-indigo-700 rounded">
          <ShoppingCart /> Sales
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
