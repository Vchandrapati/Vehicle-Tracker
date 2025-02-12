// pages/index.js
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-c1 via-c3 to-c5 p-4 flex items-center justify-center">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          Welcome to Vehicle Tracker
        </h1>
        <p className="text-gray-700 dark:text-gray-200 mb-6">
          Scan an NFC tag to go directly to a vehicle page.
        </p>
        <Link
          href="/admin"
          className="inline-block px-6 py-3 font-bold text-white bg-gradient-to-r from-c1 via-c3 to-c5 rounded-md hover:opacity-90 transition"
        >
          Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
