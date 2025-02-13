import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-container-center">
      <div className="card card-md text-center">
        <h1 className="heading heading-lg mb-4">
          Welcome to Vehicle Tracker
        </h1>
        <p className="text-gray-700 dark:text-gray-200 mb-6">
          Scan an NFC tag to go directly to a vehicle page.
        </p>
        <Link href="/admin">
          <a className="btn-gradient inline-block px-6 py-3 font-bold text-white">
            Admin Dashboard
          </a>
        </Link>
      </div>
    </div>
  );
}
