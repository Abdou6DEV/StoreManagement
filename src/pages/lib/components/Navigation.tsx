import { useLocation, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Settings } from "lucide-react";
import { ThemeToggleButton } from "./ui/ThemeToggleButton";
import { useState } from 'react';

export default function Navigation() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 w-full">
      <Link to="/">
        <img src="/logo.png" alt="Store Logo" className="w-50 p-5" />
      </Link>

      <nav className="px-8 py-3 rounded-xl border flex-1 flex items-center justify-between select-none">
        <div className="w-40"></div>

        <h1 className="text-2xl font-bold mx-auto">
          {location.pathname === "/"
            ? "Main Menu"
            : location.pathname.slice(1).charAt(0).toUpperCase() +
              location.pathname.slice(2)}
        </h1>

        <div className="flex items-center gap-4 w-40 justify-end">
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
                <Settings className={`
                  transition-transform duration-400
                  ${dropdownOpen ? 'rotate-360 scale-110' : ''}
                  hover:text-red-400
                `} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mx-4 my-2 w-56">
              <DropdownMenuLabel className="font-semibold text-md">
                Preferences
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <ThemeToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}