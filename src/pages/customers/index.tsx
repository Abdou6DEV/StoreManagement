import { Link } from "react-router-dom";

export default function Customers() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <p>Customer management page</p>
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Main Menu
      </Link>
    </div>
  );
}
