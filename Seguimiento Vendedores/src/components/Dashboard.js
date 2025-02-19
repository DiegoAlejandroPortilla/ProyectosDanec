import React from "react";
import { DollarSign, Users, ShoppingCart } from "lucide-react";

const Dashboard = () => {
  return (
    <main className="flex-1 p-5">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <input type="text" placeholder="Search..." className="border px-3 py-1 rounded" />
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-4 gap-4 mt-5">
        <div className="bg-white p-5 rounded-lg shadow flex justify-between">
          <div>
            <h3 className="text-sm text-gray-500">Today's Money</h3>
            <p className="text-2xl font-semibold">$53,000</p>
            <p className="text-green-500 text-sm">+55% since yesterday</p>
          </div>
          <DollarSign className="text-indigo-600" />
        </div>

        <div className="bg-white p-5 rounded-lg shadow flex justify-between">
          <div>
            <h3 className="text-sm text-gray-500">Today's Users</h3>
            <p className="text-2xl font-semibold">2,300</p>
            <p className="text-green-500 text-sm">+3% since last week</p>
          </div>
          <Users className="text-red-600" />
        </div>

        <div className="bg-white p-5 rounded-lg shadow flex justify-between">
          <div>
            <h3 className="text-sm text-gray-500">New Clients</h3>
            <p className="text-2xl font-semibold">+3,462</p>
            <p className="text-red-500 text-sm">-2% since last quarter</p>
          </div>
          <Users className="text-green-600" />
        </div>

        <div className="bg-white p-5 rounded-lg shadow flex justify-between">
          <div>
            <h3 className="text-sm text-gray-500">Sales</h3>
            <p className="text-2xl font-semibold">$103,430</p>
            <p className="text-green-500 text-sm">+5% than last month</p>
          </div>
          <ShoppingCart className="text-orange-600" />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
