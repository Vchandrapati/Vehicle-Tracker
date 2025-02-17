import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ToolPage() {
  const router = useRouter();
  const { toolId } = router.query;

  // PIN authentication states
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // Tool and form states
  const [tool, setTool] = useState(null);
  const [contractor, setContractor] = useState(""); // Person who will use the tool (Contractor)
  const [checkedOutBy, setCheckedOutBy] = useState(""); // Person signing out the tool
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // Popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success"); // "success" or "error"

  // Fetch tool data when logged in and when toolId is available
  useEffect(() => {
    if (loggedIn && toolId) {
      fetchTool(toolId);
    }
  }, [loggedIn, toolId]);

  // Attempt to auto-fill location using Geolocation and reverse geocoding (Nominatim)
  useEffect(() => {
    if (loggedIn && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Call reverse geocoding
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );
            const data = await res.json();
            if (data && data.display_name) {
              setLocation(data.display_name);
            } else {
              // Fallback to coordinates if no address found
              setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
          } catch (err) {
            console.error("Reverse geocoding error:", err);
            setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Optionally set a default or leave empty.
        }
      );
    }
  }, [loggedIn]);

  // PIN handler (for demonstration, the PIN is "4321")
  function handlePinSubmit(e) {
    e.preventDefault();
    if (pin === "4321") {
      setLoggedIn(true);
    } else {
      alert("Incorrect PIN");
    }
  }

  async function fetchTool(id) {
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch tool error:", error);
      showPopupMessage("Tool not found or error loading tool.", "error");
    } else {
      setTool(data);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!contractor || !checkedOutBy || !location || !toolId) return;
    setLoading(true);

    try {
      // If the tool is in use by a different contractor, check it in first.
      if (tool?.in_use && tool?.current_user_name !== contractor) {
        await checkIn(
          toolId,
          tool.current_user_name,
          tool.checked_out_by,
          location
        );
      }

      // If the tool is free or the current contractor is different, perform a checkout.
      if (!tool?.in_use || tool?.current_user_name !== contractor) {
        await checkOut(toolId, contractor, checkedOutBy, location);
        showPopupMessage(
          `Tool ${toolId} checked out by ${checkedOutBy} for ${contractor}.`,
          "success"
        );
      } else {
        // If the same contractor submits again, check it in.
        await checkIn(toolId, contractor, checkedOutBy, location);
        showPopupMessage(`Tool ${toolId} checked in by ${checkedOutBy}.`, "success");
      }

      // Refresh tool data
      await fetchTool(toolId);
    } catch (err) {
      console.error("Submit error:", err);
      showPopupMessage("Error updating tool status.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function checkOut(id, contractorName, checkoutName, location) {
    const { error } = await supabase
      .from("tools")
      .update({
        in_use: true,
        current_user_name: contractorName,
        checked_out_by: checkoutName,
        current_location: location,
        last_activity: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      await supabase.from("tool_logs").insert([
        {
          tool_id: id,
          event_type: "checkout",
          user_name: contractorName,
          checked_out_by: checkoutName,
          location: location,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      throw new Error("Checkout failed");
    }
  }

  async function checkIn(id, contractorName, checkoutName, location) {
    const { error } = await supabase
      .from("tools")
      .update({
        in_use: false,
        current_user_name: null,
        checked_out_by: null,
        current_location: location,
        last_activity: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      await supabase.from("tool_logs").insert([
        {
          tool_id: id,
          event_type: "checkin",
          user_name: contractorName,
          checked_out_by: checkoutName,
          location: location,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      throw new Error("Check-in failed");
    }
  }

  // Helper functions for the popup
  function showPopupMessage(message, type = "success") {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  }

  function closePopup() {
    setShowPopup(false);
    setPopupMessage("");
  }

  // If not logged in, show the PIN code page.
  if (!loggedIn) {
    return (
      <div className="page-container-center">
        <div className="card card-sm">
          <h1 className="heading heading-lg mb-6">Enter PIN</h1>
          <form onSubmit={handlePinSubmit} className="flex flex-col space-y-4">
            <input
              type="password"
              className="form-input"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
            <button type="submit" className="btn">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flex items-center justify-center">
      {/* Popup Overlay */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h2
              className={`heading-lg mb-4 ${
                popupType === "success" ? "text-green-500" : "text-red-500"
              }`}
            >
              {popupType === "success" ? "Success" : "Error"}
            </h2>
            <p className="text-gray-700 dark:text-gray-200">{popupMessage}</p>
            <button onClick={closePopup} className="btn mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="card card-xl">
        <h1 className="heading heading-lg mb-6">
          Tool: {tool ? tool.name : toolId || "Loading..."}
        </h1>

        {/* Tool Information */}
        {tool ? (
          <div className="mb-6">
            <p className="mb-2 text-gray-700 dark:text-gray-200">
              <strong>Status:</strong>{" "}
              {tool.in_use
                ? `In use by ${tool.current_user_name ?? "Unknown"} (checked out by ${tool.checked_out_by ?? "Unknown"})`
                : "Available"}
            </p>
            <p className="mb-2 text-gray-700 dark:text-gray-200">
              <strong>Current Location:</strong> {tool.current_location || "N/A"}
            </p>
          </div>
        ) : (
          <p className="mb-6 text-gray-700 dark:text-gray-200">
            Loading tool info...
          </p>
        )}

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Who is checking out the tool? (Your Name)
            </label>
            <input
              type="text"
              className="form-input w-full"
              value={checkedOutBy}
              onChange={(e) => setCheckedOutBy(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Who will be using the tool? (Contractor)
            </label>
            <input
              type="text"
              className="form-input w-full"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Location
            </label>
            <input
              type="text"
              className="form-input w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn">
            {tool?.in_use && tool?.current_user_name === contractor
              ? "Check In"
              : "Check Out / Take Over"}
          </button>
        </form>
      </div>
    </div>
  );
}
