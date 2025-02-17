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
  const [selectedTab, setSelectedTab] = useState("vehicles");

  // Vehicles state
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);

  // Tools state
  const [tools, setTools] = useState([]);
  const [toolLogs, setToolLogs] = useState([]);

  // For demonstration, the admin password is hard-coded.
  function handleLogin(e) {
    e.preventDefault();
    if (password === "admin123") {
      setLoggedIn(true);
    } else {
      alert("Incorrect password");
    }
  }

  useEffect(() => {
    if (loggedIn) {
      let interval;
      if (selectedTab === "vehicles") {
        fetchVehicles();
        fetchLogs();
        interval = setInterval(() => {
          fetchVehicles();
          fetchLogs();
        }, 10000);
      } else if (selectedTab === "tools") {
        fetchTools();
        fetchToolLogs();
        interval = setInterval(() => {
          fetchTools();
          fetchToolLogs();
        }, 10000);
      }
      return () => clearInterval(interval);
    }
  }, [loggedIn, selectedTab]);

  async function fetchVehicles() {
    // Order vehicles alphabetically by id
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });
    if (!error) setVehicles(data);
  }

  async function fetchLogs() {
    // Logs remain ordered by created_at (latest first)
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setLogs(data);
  }

  async function fetchTools() {
    // Order tools alphabetically by id
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .order("id", { ascending: true });
    if (!error) setTools(data);
  }

  async function fetchToolLogs() {
    const { data, error } = await supabase
      .from("tool_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setToolLogs(data);
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

        {/* Elegant Tab Navigation */}
        <div className="flex space-x-6 border-b border-gray-300 mb-6">
          <button
            onClick={() => setSelectedTab("vehicles")}
            className={`pb-2 transition-colors duration-300 font-medium ${
              selectedTab === "vehicles"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setSelectedTab("tools")}
            className={`pb-2 transition-colors duration-300 font-medium ${
              selectedTab === "tools"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Tools
          </button>
        </div>

        {selectedTab === "vehicles" && (
          <>
            {/* Vehicles Section */}
            <h2 className="heading-xl mb-4">Vehicles</h2>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-left border-collapse admin-table">
                <thead>
                  <tr className="table-header">
                    <th>ID</th>
                    <th>Plate Number</th>
                    <th>Status</th>
                    <th>Odometer</th>
                    <th>Last Driver</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{v.id}</td>
                      <td className="py-3 px-4">{v.plate_number || "N/A"}</td>
                      <td className="py-3 px-4">
                        {v.in_use ? `In use by ${v.current_driver || "Unknown"}` : "Free"}
                      </td>
                      <td className="py-3 px-4">{v.current_odometer}</td>
                      <td className="py-3 px-4">{v.last_driver || "N/A"}</td>
                      <td className="py-3 px-4">{formatDateTime(v.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vehicle Logs Section */}
            <h2 className="heading-xl mb-4">Vehicle Logs</h2>
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
          </>
        )}

        {selectedTab === "tools" && (
          <>
            {/* Tools Section */}
            <h2 className="heading-xl mb-4">Tools</h2>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-left border-collapse admin-table">
                <thead>
                  <tr className="table-header">
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Current User (Contractor)</th>
                    <th>Checked Out By</th>
                    <th>Current Location</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{t.id}</td>
                      <td className="py-3 px-4">{t.name}</td>
                      <td className="py-3 px-4">{t.in_use ? "In use" : "Available"}</td>
                      <td className="py-3 px-4">{t.current_user_name || "N/A"}</td>
                      <td className="py-3 px-4">{t.checked_out_by || "N/A"}</td>
                      <td className="py-3 px-4">{t.current_location || "N/A"}</td>
                      <td className="py-3 px-4">{formatDateTime(t.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tool Logs Section */}
            <h2 className="heading-xl mb-4">Tool Logs</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {toolLogs.map((log) => (
                <div key={log.id} className="log-card">
                  <p className="mb-1">
                    <strong>Tool:</strong> {log.tool_id}
                  </p>
                  <p className="mb-1">
                    <strong>Event:</strong> {log.event_type}
                  </p>
                  <p className="mb-1">
                    <strong>Contractor:</strong> {log.user_name}
                  </p>
                  <p className="mb-1">
                    <strong>Checked Out By:</strong> {log.checked_out_by}
                  </p>
                  <p className="mb-1">
                    <strong>Location:</strong> {log.location}
                  </p>
                  <p>
                    <strong>Time:</strong> {formatDateTime(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
