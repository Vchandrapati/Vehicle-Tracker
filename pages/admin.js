import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function formatDateTime(timestamp) {
  if (!timestamp) return "Never Used";
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);

  const adminPassword =
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  useEffect(() => {
    if (loggedIn) {
      fetchVehicles();
      fetchLogs();
      const interval = setInterval(() => {
        fetchVehicles();
        fetchLogs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [loggedIn]);

  async function fetchVehicles() {
    const { data, error } = await supabase.from("vehicles").select("*");
    if (!error) setVehicles(data);
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setLogs(data);
  }

  function handleLogin(e) {
    e.preventDefault();
    // For demonstration, you have "admin123" hard-coded.
    // You might want to compare it to adminPassword in real usage.
    if (password === "admin123") {
      setLoggedIn(true);
    } else {
      alert("Incorrect password");
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-c1 via-c3 to-c5 p-4">
        <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col space-y-4">
            <input
              type="password"
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:border-c2 text-gray-700 dark:text-gray-200 bg-transparent"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-c1 to-c2 hover:from-c2 hover:to-c3 text-white font-semibold py-2 rounded-md"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-c1 via-c3 to-c5 p-4">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
          Admin Dashboard
        </h1>

        {/* Vehicles Section */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Vehicles
        </h2>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-c1 to-c2 text-white">
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Odometer</th>
                <th className="py-3 px-4 font-semibold">Last Driver</th>
                <th className="py-3 px-4 font-semibold">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-3 px-4">{v.id}</td>
                  <td className="py-3 px-4">
                    {v.in_use
                      ? `In use by ${v.current_driver || "Unknown"}`
                      : "Free"}
                  </td>
                  <td className="py-3 px-4">{v.current_odometer}</td>
                  <td className="py-3 px-4">{v.last_driver || "N/A"}</td>
                  <td className="py-3 px-4">{formatDateTime(v.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Logs Section */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Logs
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
            >
              <p className="mb-1 text-gray-700 dark:text-gray-200">
                <strong>Vehicle:</strong> {log.vehicle_id}
              </p>
              <p className="mb-1 text-gray-700 dark:text-gray-200">
                <strong>Event:</strong> {log.event_type}
              </p>
              <p className="mb-1 text-gray-700 dark:text-gray-200">
                <strong>Driver:</strong> {log.driver}
              </p>
              <p className="mb-1 text-gray-700 dark:text-gray-200">
                <strong>Odometer:</strong> {log.odometer}
              </p>
              <p className="text-gray-700 dark:text-gray-200">
                <strong>Time:</strong> {formatDateTime(log.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
