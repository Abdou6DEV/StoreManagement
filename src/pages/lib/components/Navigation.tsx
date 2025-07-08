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

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="px-4 py-2 rounded-xl border flex items-center justify-between select-none">
      <Link to="/">
        <img src="/logo.png" alt="Store Logo" className="w-24" />
      </Link>
      <h1 className="text-2xl font-bold">
        {location.pathname === "/"
          ? "Main Menu"
          : location.pathname.slice(1).charAt(0).toUpperCase() +
            location.pathname.slice(2)}
      </h1>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-xl outline-none ring-0">
            <Settings />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="mx-4 my-2">
            <DropdownMenuLabel className="font-semibold text-md">
              Preferences
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ThemeToggleButton
                variant="ghost"
                className="flex items-center justify-between gap-2"
                showText={true}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
