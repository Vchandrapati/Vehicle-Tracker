// pages/tool.js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ToolPage() {
  const router = useRouter();
  const { toolId } = router.query;

  // PIN authentication states
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [pinError, setPinError] = useState("");

  // Tool and form states
  const [tool, setTool] = useState(null);
  const [contractor, setContractor] = useState("");
  const [checkedOutBy, setCheckedOutBy] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  // Form validation
  const [errors, setErrors] = useState({});

  // Fetch tool data when logged in and when toolId is available
  useEffect(() => {
    if (loggedIn && toolId) {
      fetchTool(toolId);
    }
  }, [loggedIn, toolId]);

  // Auto-fill location using Geolocation
  useEffect(() => {
    if (loggedIn) {
      getCurrentLocation();
    }
  }, [loggedIn]);

  // PIN handler
  function handlePinSubmit(e) {
    e.preventDefault();
    setPinError("");
    
    if (pin === "1289") {
      setLoggedIn(true);
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPin("");
    }
  }

  async function getCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocation("Location services not available");
      return;
    }

    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            // Extract more relevant parts of the address
            const addressParts = data.display_name.split(", ");
            const relevantParts = addressParts.slice(0, 3).join(", ");
            setLocation(relevantParts);
          } else {
            setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocation("Unable to determine location");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }

  async function fetchTool(id) {
    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Fetch tool error:", error);
        showPopupMessage("Tool not found or error loading tool data.", "error");
      } else {
        setTool(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showPopupMessage("Failed to load tool information.", "error");
    } finally {
      setInitialLoading(false);
    }
  }

  // Form validation
  function validateForm() {
    const newErrors = {};
    
    if (!contractor.trim()) {
      newErrors.contractor = "Contractor name is required";
    }
    
    if (!checkedOutBy.trim()) {
      newErrors.checkedOutBy = "Your name is required";
    }
    
    if (!location.trim()) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const isCurrentUser = tool?.current_user_name === contractor.trim();
      const isToolInUse = tool?.in_use;

      // If tool is in use by a different contractor, check it in first
      if (isToolInUse && !isCurrentUser) {
        await checkIn(
          toolId,
          tool.current_user_name,
          tool.checked_out_by,
          location.trim()
        );
        showPopupMessage(
          `Tool automatically returned from ${tool.current_user_name} and checked out to ${contractor.trim()}.`,
          "success"
        );
      }

      // Perform checkout or checkin based on current state
      if (!isToolInUse || !isCurrentUser) {
        await checkOut(toolId, contractor.trim(), checkedOutBy.trim(), location.trim());
        if (!isToolInUse) {
          showPopupMessage(
            `Tool ${tool?.name || toolId} successfully checked out to ${contractor.trim()}.`,
            "success"
          );
        }
      } else {
        await checkIn(toolId, contractor.trim(), checkedOutBy.trim(), location.trim());
        showPopupMessage(
          `Tool ${tool?.name || toolId} successfully checked in by ${checkedOutBy.trim()}.`,
          "success"
        );
      }

      // Clear form and refresh data
      setContractor("");
      setCheckedOutBy("");
      await fetchTool(toolId);
      
    } catch (err) {
      console.error("Submit error:", err);
      showPopupMessage("Failed to update tool status. Please try again.", "error");
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

    if (error) throw new Error("Checkout failed");

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

    if (error) throw new Error("Check-in failed");

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
  }

  function showPopupMessage(message, type = "success") {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  }

  function closePopup() {
    setShowPopup(false);
    setPopupMessage("");
  }

  function getActionButtonText() {
    if (loading) return "Processing...";
    if (!tool) return "Loading...";
    
    const isCurrentUser = tool.current_user_name === contractor.trim();
    const isToolInUse = tool.in_use;
    
    if (isToolInUse && isCurrentUser) {
      return "Return Tool";
    } else if (isToolInUse) {
      return "Transfer Tool";
    } else {
      return "Check Out Tool";
    }
  }

  // PIN authentication screen
  if (!loggedIn) {
    return (
      <div className="page-container-center">
        <div className="card card-md">
          <div className="text-center mb-6">
            <h1 className="heading heading-xl mb-2">Tool Access</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your PIN to continue
            </p>
          </div>
          
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="form-label">Security PIN</label>
              <input
                type="password"
                className={`form-input w-full ${pinError ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                required
              />
              {pinError && (
                <p className="text-red-500 text-sm mt-1">{pinError}</p>
              )}
            </div>
            
            <button type="submit" className="btn btn-primary w-full">
              Access System
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Success/Error Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                popupType === "success" 
                  ? "bg-green-100 text-green-600" 
                  : "bg-red-100 text-red-600"
              }`}>
                {popupType === "success" ? "✓" : "⚠"}
              </div>
              
              <h2 className="heading heading-md mb-3">
                {popupType === "success" ? "Success" : "Error"}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {popupMessage}
              </p>
              
              <button onClick={closePopup} className="btn btn-primary">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="heading heading-2xl mb-2">
            Tool Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tool: <span className="font-semibold text-blue-600">
              {tool ? `${tool.name} (ID: ${toolId})` : toolId || "Loading..."}
            </span>
          </p>
        </div>

        {/* Tool Status Card */}
        {initialLoading ? (
          <div className="card mb-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ) : tool ? (
          <div className="card mb-6">
            <h2 className="heading heading-md mb-4">Tool Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Status
                </label>
                <div className="mt-1">
                  {tool.in_use ? (
                    <span className="status-badge status-badge-checked-out">
                      In Use - {tool.current_user_name || "Unknown"}
                    </span>
                  ) : (
                    <span className="status-badge status-badge-checked-in">
                      Available
                    </span>
                  )}
                </div>
              </div>
              
              {tool.in_use && tool.checked_out_by && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Checked Out By
                  </label>
                  <p className="mt-1 font-semibold">
                    {tool.checked_out_by}
                  </p>
                </div>
              )}
              
              <div className={tool.in_use && tool.checked_out_by ? "" : "md:col-span-2"}>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Location
                </label>
                <p className="mt-1">
                  {tool.current_location || "Location not recorded"}
                </p>
              </div>
              
              {tool.last_activity && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Last Activity
                  </label>
                  <p className="mt-1">
                    {new Date(tool.last_activity).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-error mb-6">
            <p>Unable to load tool information. Please try refreshing the page.</p>
          </div>
        )}

        {/* Action Form */}
        <div className="card">
          <h2 className="heading heading-md mb-6">Tool Action</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">Your Name (Person Checking Out) *</label>
              <input
                type="text"
                className={`form-input w-full ${errors.checkedOutBy ? 'border-red-500' : ''}`}
                placeholder="Enter your full name"
                value={checkedOutBy}
                onChange={(e) => setCheckedOutBy(e.target.value)}
                disabled={loading}
                required
              />
              {errors.checkedOutBy && (
                <p className="text-red-500 text-sm mt-1">{errors.checkedOutBy}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Contractor Name (Tool User) *</label>
              <input
                type="text"
                className={`form-input w-full ${errors.contractor ? 'border-red-500' : ''}`}
                placeholder="Enter contractor's full name"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                disabled={loading}
                required
              />
              {errors.contractor && (
                <p className="text-red-500 text-sm mt-1">{errors.contractor}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                The person who will be using this tool
              </p>
            </div>
            
            <div>
              <label className="form-label">Current Location *</label>
              <div className="relative">
                <input
                  type="text"
                  className={`form-input w-full pr-12 ${errors.location ? 'border-red-500' : ''}`}
                  placeholder="Tool location will be detected automatically"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  required
                />
                {locationLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="loading-spinner"></span>
                  </div>
                )}
              </div>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500">
                  Location detected automatically using GPS
                </p>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading || loading}
                  className="btn btn-outline btn-sm"
                >
                  {locationLoading ? "Detecting..." : "Refresh Location"}
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading || !tool || locationLoading}
                className="btn btn-primary w-full btn-lg"
              >
                {loading && (
                  <span className="loading-spinner mr-2"></span>
                )}
                {getActionButtonText()}
              </button>
              
              <p className="text-sm text-gray-500 text-center mt-3">
                {tool?.in_use && tool?.current_user_name === contractor.trim()
                  ? "This will return the tool and mark it as available"
                  : tool?.in_use
                  ? "This will transfer the tool to the specified contractor"
                  : "This will check the tool out to the specified contractor"
                }
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}