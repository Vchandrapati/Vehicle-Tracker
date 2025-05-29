import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function VehiclePage() {
  const router = useRouter();
  const { vehicleId } = router.query;

  // PIN authentication states
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [pinError, setPinError] = useState("");

  // Vehicle and form states
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState("");
  const [odometer, setOdometer] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // Popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  // Form validation
  const [errors, setErrors] = useState({});

  // Fetch vehicle data when logged in and when vehicleId is available
  useEffect(() => {
    if (loggedIn && vehicleId) {
      fetchVehicle(vehicleId);
    }
  }, [loggedIn, vehicleId]);

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

  async function fetchVehicle(id) {
    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        showPopupMessage("Vehicle not found or error loading vehicle data.", "error");
      } else {
        setVehicle(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showPopupMessage("Failed to load vehicle information.", "error");
    } finally {
      setInitialLoading(false);
    }
  }

  // Form validation
  function validateForm() {
    const newErrors = {};
    
    if (!driver.trim()) {
      newErrors.driver = "Driver name is required";
    }
    
    if (!odometer || odometer <= 0) {
      newErrors.odometer = "Valid odometer reading is required";
    }
    
    // Check if odometer reading is reasonable (not going backwards significantly)
    if (vehicle && odometer < vehicle.current_odometer - 1000) {
      newErrors.odometer = "Odometer reading seems too low compared to current reading";
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
      const isCurrentDriver = vehicle?.current_driver === driver.trim();
      const isVehicleInUse = vehicle?.in_use;

      // If vehicle is in use by a different driver, check them in first
      if (isVehicleInUse && !isCurrentDriver) {
        await checkIn(vehicleId, vehicle.current_driver, vehicle.current_odometer);
        showPopupMessage(
          `Vehicle ${vehicleId} automatically checked in from ${vehicle.current_driver} and checked out to ${driver.trim()}.`,
          "success"
        );
      }

      // Perform checkout or checkin based on current state
      if (!isVehicleInUse || !isCurrentDriver) {
        await checkOut(vehicleId, driver.trim(), Number(odometer));
        if (!isVehicleInUse) {
          showPopupMessage(`Vehicle ${vehicleId} successfully checked out to ${driver.trim()}.`, "success");
        }
      } else {
        await checkIn(vehicleId, driver.trim(), Number(odometer));
        showPopupMessage(`Vehicle ${vehicleId} successfully checked in by ${driver.trim()}.`, "success");
      }

      // Clear form and refresh data
      setDriver("");
      setOdometer("");
      await fetchVehicle(vehicleId);
      
    } catch (err) {
      console.error("Submit error:", err);
      showPopupMessage("Failed to update vehicle status. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function checkOut(id, driverName, odom) {
    const { error } = await supabase
      .from("vehicles")
      .update({
        in_use: true,
        current_driver: driverName,
        current_odometer: odom,
        last_driver: driverName,
        last_activity: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error("Checkout failed");

    await supabase.from("logs").insert([
      {
        vehicle_id: id,
        event_type: "checkout",
        driver: driverName,
        odometer: odom,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async function checkIn(id, driverName, odom) {
    const { error } = await supabase
      .from("vehicles")
      .update({
        in_use: false,
        current_driver: null,
        current_odometer: odom,
        last_driver: driverName,
        last_activity: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error("Check-in failed");

    await supabase.from("logs").insert([
      {
        vehicle_id: id,
        event_type: "checkin",
        driver: driverName,
        odometer: odom,
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
    if (!vehicle) return "Loading...";
    
    const isCurrentDriver = vehicle.current_driver === driver.trim();
    const isVehicleInUse = vehicle.in_use;
    
    if (isVehicleInUse && isCurrentDriver) {
      return "Check In Vehicle";
    } else if (isVehicleInUse) {
      return "Take Over Vehicle";
    } else {
      return "Check Out Vehicle";
    }
  }

  // PIN authentication screen
  if (!loggedIn) {
    return (
      <div className="page-container-center">
        <div className="card card-md">
          <div className="text-center mb-6">
            <h1 className="heading heading-xl mb-2">Vehicle Access</h1>
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
            Vehicle Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vehicle ID: <span className="font-semibold text-blue-600">{vehicleId || "Loading..."}</span>
          </p>
        </div>

        {/* Vehicle Status Card */}
        {initialLoading ? (
          <div className="card mb-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : vehicle ? (
          <div className="card mb-6">
            <h2 className="heading heading-md mb-4">Vehicle Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Status
                </label>
                <div className="mt-1">
                  {vehicle.in_use ? (
                    <span className="status-badge status-badge-checked-out">
                      In Use - {vehicle.current_driver || "Unknown Driver"}
                    </span>
                  ) : (
                    <span className="status-badge status-badge-checked-in">
                      Available
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Odometer
                </label>
                <p className="mt-1 text-lg font-semibold">
                  {vehicle.current_odometer?.toLocaleString() || "0"} km
                </p>
              </div>
              
              {vehicle.last_activity && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Last Activity
                  </label>
                  <p className="mt-1">
                    {new Date(vehicle.last_activity).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-error mb-6">
            <p>Unable to load vehicle information. Please try refreshing the page.</p>
          </div>
        )}

        {/* Action Form */}
        <div className="card">
          <h2 className="heading heading-md mb-6">Vehicle Action</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">Driver Name *</label>
              <input
                type="text"
                className={`form-input w-full ${errors.driver ? 'border-red-500' : ''}`}
                placeholder="Enter your full name"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                disabled={loading}
                required
              />
              {errors.driver && (
                <p className="text-red-500 text-sm mt-1">{errors.driver}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Odometer Reading (km) *</label>
              <input
                type="number"
                min="0"
                step="1"
                className={`form-input w-full ${errors.odometer ? 'border-red-500' : ''}`}
                placeholder="Enter current odometer reading"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                disabled={loading}
                required
              />
              {errors.odometer && (
                <p className="text-red-500 text-sm mt-1">{errors.odometer}</p>
              )}
              {vehicle && (
                <p className="text-sm text-gray-500 mt-1">
                  Previous reading: {vehicle.current_odometer?.toLocaleString() || "0"} km
                </p>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading || !vehicle}
                className="btn btn-primary w-full btn-lg"
              >
                {loading && (
                  <span className="loading-spinner mr-2"></span>
                )}
                {getActionButtonText()}
              </button>
              
              <p className="text-sm text-gray-500 text-center mt-3">
                {vehicle?.in_use && vehicle?.current_driver === driver.trim()
                  ? "This will check the vehicle back in"
                  : vehicle?.in_use
                  ? "This will transfer the vehicle to you"
                  : "This will check the vehicle out to you"
                }
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}