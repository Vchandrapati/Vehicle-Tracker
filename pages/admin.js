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

// Helper function to calculate days remaining until expiration
function daysRemaining(expirationDate) {
  if (!expirationDate) return "N/A";
  const now = new Date();
  const expDate = new Date(expirationDate);
  const diff = expDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedTab, setSelectedTab] = useState("vehicles");

  // Sorting state for vehicles and tools
  const [vehicleSort, setVehicleSort] = useState("name"); // "name" or "status"
  const [toolSort, setToolSort] = useState("name"); // "name" or "status"

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

  // Fetch vehicles using the current sort option
  async function fetchVehicles() {
    let orderField, ascending;
    if (vehicleSort === "name") {
      orderField = "plate_number";
      ascending = true;
    } else if (vehicleSort === "status") {
      orderField = "in_use";
      ascending = false; // in use (true) will come first
    } else {
      orderField = "id";
      ascending = true;
    }
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order(orderField, { ascending });
    if (!error) setVehicles(data);
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setLogs(data);
  }

  // Fetch tools using the current sort option (tool id removed from display)
  async function fetchTools() {
    let orderField, ascending;
    if (toolSort === "name") {
      orderField = "name";
      ascending = true;
    } else if (toolSort === "status") {
      orderField = "in_use";
      ascending = false; // in use (true) comes first
    } else {
      orderField = "id";
      ascending = true;
    }
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .order(orderField, { ascending });
    if (!error) setTools(data);
  }

  async function fetchToolLogs() {
    const { data, error } = await supabase
      .from("tool_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setToolLogs(data);
  }

  // Main interval useEffect that refetches data every 10 seconds when logged in
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

  // Re-fetch vehicles when the sort option changes
  useEffect(() => {
    if (loggedIn && selectedTab === "vehicles") {
      fetchVehicles();
    }
  }, [vehicleSort, loggedIn, selectedTab]);

  // Re-fetch tools when the sort option changes
  useEffect(() => {
    if (loggedIn && selectedTab === "tools") {
      fetchTools();
    }
  }, [toolSort, loggedIn, selectedTab]);

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
            {/* Sorting Controls for Vehicles */}
            <div className="mb-4 flex items-center">
              <label className="mr-2 font-medium text-gray-700 dark:text-gray-200">
                Sort by:
              </label>
              <select
                value={vehicleSort}
                onChange={(e) => setVehicleSort(e.target.value)}
                className="form-select block w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              >
                <option value="name">Name (Plate Number)</option>
                <option value="status">Status</option>
              </select>
            </div>

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
                    <th>Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => {
                    const days = daysRemaining(v.registration_expiration);
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{v.id}</td>
                        <td className="py-3 px-4">{v.plate_number || "N/A"}</td>
                        <td className="py-3 px-4">
                          {v.in_use
                            ? `In use by ${v.current_driver || "Unknown"}`
                            : "Free"}
                        </td>
                        <td className="py-3 px-4">{v.current_odometer}</td>
                        <td className="py-3 px-4">{v.last_driver || "N/A"}</td>
                        <td className="py-3 px-4">
                          {formatDateTime(v.last_activity)}
                        </td>
                        <td
                          className={`py-3 px-4 ${
                            typeof days === "number" && days <= 21
                              ? "text-red-500"
                              : "text-gray-700"
                          }`}
                        >
                          {days}
                        </td>
                      </tr>
                    );
                  })}
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
            {/* Sorting Controls for Tools */}
            <div className="mb-4 flex items-center">
              <label className="mr-2 font-medium text-gray-700 dark:text-gray-200">
                Sort by:
              </label>
              <select
                value={toolSort}
                onChange={(e) => setToolSort(e.target.value)}
                className="form-select block w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Tools Section */}
            <h2 className="heading-xl mb-4">Tools</h2>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-left border-collapse admin-table">
                <thead>
                  <tr className="table-header">
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
                    <tr
                      key={t.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">{t.name}</td>
                      <td className="py-3 px-4">
                        {t.in_use ? "In use" : "Available"}
                      </td>
                      <td className="py-3 px-4">
                        {t.current_user_name || "N/A"}
                      </td>
                      <td className="py-3 px-4">{t.checked_out_by || "N/A"}</td>
                      <td className="py-3 px-4">
                        {t.current_location || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {formatDateTime(t.last_activity)}
                      </td>
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
