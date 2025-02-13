// pages/vehicle.js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function VehiclePage() {
  const router = useRouter();
  const { vehicleId } = router.query;

  // PIN authentication states
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // Vehicle and form states
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState("");
  const [odometer, setOdometer] = useState("");
  const [loading, setLoading] = useState(false);

  // Popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success"); // "success" or "error"

  // Fetch vehicle data when logged in and when vehicleId is available
  useEffect(() => {
    if (loggedIn && vehicleId) {
      fetchVehicle(vehicleId);
    }
  }, [loggedIn, vehicleId]);

  // PIN handler (for demonstration, the PIN is "1234")
  function handlePinSubmit(e) {
    e.preventDefault();
    if (pin === "1289") {
      setLoggedIn(true);
    } else {
      alert("Incorrect PIN");
    }
  }

  async function fetchVehicle(id) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      showPopupMessage("Vehicle not found or error loading vehicle.", "error");
    } else {
      setVehicle(data);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!driver || !odometer || !vehicleId) return;
    setLoading(true);

    try {
      // If vehicle is in use by a different driver, check them in first.
      if (vehicle?.in_use && vehicle?.current_driver !== driver) {
        await checkIn(vehicleId, vehicle.current_driver, vehicle.current_odometer);
      }

      // If vehicle is free or was just checked in, perform a checkout.
      if (!vehicle?.in_use || vehicle?.current_driver !== driver) {
        await checkOut(vehicleId, driver, Number(odometer));
        showPopupMessage(`Vehicle ${vehicleId} checked out to ${driver}.`, "success");
      } else {
        // If the same driver submits again, check in.
        await checkIn(vehicleId, driver, Number(odometer));
        showPopupMessage(`Vehicle ${vehicleId} checked in by ${driver}.`, "success");
      }

      // Refresh vehicle data
      await fetchVehicle(vehicleId);
    } catch (err) {
      console.error(err);
      showPopupMessage("Error updating vehicle status.", "error");
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

    if (!error) {
      await supabase.from("logs").insert([
        {
          vehicle_id: id,
          event_type: "checkout",
          driver: driverName,
          odometer: odom,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      throw new Error("Checkout failed");
    }
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

    if (!error) {
      await supabase.from("logs").insert([
        {
          vehicle_id: id,
          event_type: "checkin",
          driver: driverName,
          odometer: odom,
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
          Vehicle: {vehicleId || "Loading..."}
        </h1>

        {/* Vehicle Information */}
        {vehicle ? (
          <div className="mb-6">
            <p className="mb-2 text-gray-700 dark:text-gray-200">
              <strong>Status:</strong>{" "}
              {vehicle.in_use
                ? `In use by ${vehicle.current_driver ?? "Unknown"}`
                : "Free"}
            </p>
            <p className="mb-2 text-gray-700 dark:text-gray-200">
              <strong>Current Odometer:</strong> {vehicle.current_odometer}
            </p>
          </div>
        ) : (
          <p className="mb-6 text-gray-700 dark:text-gray-200">
            Loading vehicle info...
          </p>
        )}

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Your Name:
            </label>
            <input
              type="text"
              className="form-input w-full"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Odometer Reading:
            </label>
            <input
              type="number"
              className="form-input w-full"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn">
            {vehicle?.in_use && vehicle?.current_driver === driver
              ? "Check In"
              : "Check Out / Take Over"}
          </button>
        </form>
      </div>
    </div>
  );
}
