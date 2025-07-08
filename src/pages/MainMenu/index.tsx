import { ChartLine, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function MainMenu() {
  return (
    <main className="py-4 px-12 flex-1 rounded-xl grid grid-cols-3 gap-4">
      {[
        { name: "dashboard", icon: ChartLine },
        { name: "customers", icon: Users },
        // Add more pages as needed
      ].map((item) => (
        <Link
          to={`/${item.name}`}
          className="max-h-96 p-4 border rounded-xl hover:bg-secondary transform-all duration-300"
          key={item.name}
        >
          <h1 className="flex gap-4 font-bold capitalize text-lg">
            <item.icon size={24} />
            <span className="font-bold capitalize text-lg">{item.name}</span>
          </h1>
        </Link>
      ))}
    </main>
  );
}
