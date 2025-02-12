// pages/vehicle.js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function VehiclePage() {
  const router = useRouter();
  const { vehicleId } = router.query;

  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState("");
  const [odometer, setOdometer] = useState("");
  
  // Remove the old `message` state and use these states for the popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success"); // "success" or "error"

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle(vehicleId);
    }
  }, [vehicleId]);

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
      // If vehicle is in use by a different driver, check them in first
      if (vehicle?.in_use && vehicle?.current_driver !== driver) {
        await checkIn(vehicleId, vehicle.current_driver, vehicle.current_odometer);
      }

      // If vehicle is free or just checked in, do a checkout
      if (!vehicle?.in_use || vehicle?.current_driver !== driver) {
        await checkOut(vehicleId, driver, Number(odometer));
        showPopupMessage(`Vehicle ${vehicleId} checked out to ${driver}.`, "success");
      } else {
        // Same driver tries again => check in
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

  // Helper function to show the popup
  function showPopupMessage(message, type = "success") {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  }

  // Close popup
  function closePopup() {
    setShowPopup(false);
    setPopupMessage("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-c1 via-c3 to-c5 p-4 flex items-center justify-center">
      {/* Popup Overlay */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-80">
            <h2
              className={`text-xl font-bold mb-4 ${
                popupType === "success" ? "text-green-500" : "text-red-500"
              }`}
            >
              {popupType === "success" ? "Success" : "Error"}
            </h2>
            <p className="text-gray-700 dark:text-gray-200">{popupMessage}</p>
            <button
              onClick={closePopup}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Vehicle: {vehicleId || "Loading..."}
        </h1>

        {/* Vehicle Info */}
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
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 max-w-sm">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Your Name:
            </label>
            <input
              type="text"
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full focus:outline-none focus:border-c2 text-gray-700 dark:text-gray-200 bg-transparent"
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
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full focus:outline-none focus:border-c2 text-gray-700 dark:text-gray-200 bg-transparent"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-c1 via-c3 to-c5 text-white font-semibold py-2 rounded-md hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {vehicle?.in_use && vehicle?.current_driver === driver
              ? "Check In"
              : "Check Out / Take Over"}
          </button>
        </form>
      </div>
    </div>
  );
}
