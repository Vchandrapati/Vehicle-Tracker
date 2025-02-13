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

  // Replace this with your secure admin password logic if needed.
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
    // For demonstration, "admin123" is hard-coded.
    if (password === "admin123") {
      setLoggedIn(true);
    } else {
      alert("Incorrect password");
    }
  }

  if (!loggedIn) {
    return (
      <div className="page-container-center">
        <div className="card card-sm">
          <h1 className="heading heading-lg mb-6">Admin Login</h1>
          <form onSubmit={handleLogin} className="flex flex-col space-y-4">
            <input
              type="password"
              className="form-input"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card card-xl">
        <h1 className="heading heading-lg mb-8">Admin Dashboard</h1>

        {/* Vehicles Section */}
        <h2 className="heading-xl mb-4">Vehicles</h2>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full text-left border-collapse admin-table">
            <thead>
              <tr className="table-header">
                <th>ID</th>
                <th>Status</th>
                <th>Odometer</th>
                <th>Last Driver</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
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
        <h2 className="heading-xl mb-4">Logs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {logs.map((log) => (
            <div key={log.id} className="log-card">
              <p className="mb-1">
                <strong>Vehicle:</strong> {log.vehicle_id}
              </p>
              <p className="mb-1">
                <strong>Event:</strong> {log.event_type}
              </p>
              <p className="mb-1">
                <strong>Driver:</strong> {log.driver}
              </p>
              <p className="mb-1">
                <strong>Odometer:</strong> {log.odometer}
              </p>
              <p>
                <strong>Time:</strong> {formatDateTime(log.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
