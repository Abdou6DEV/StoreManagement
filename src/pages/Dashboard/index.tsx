import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to the dashboard!</p>
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Main Menu
      </Link>
    </div>
  );
}
