import "./index.css";
import ReactDOM from "react-dom/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeToggleButton } from "./components/ui/ThemeToggleButton";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);

function App() {
  return (
    <>
      <nav className="px-4 py-2 rounded-xl border flex items-center justify-between select-none">
        <img src="/logo.png" alt="Store Logo" className="w-24" />
        <h1 className="text-2xl font-bold">Store Management</h1>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-xl outline-none ring-0">
            <Settings />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="">
            <DropdownMenuLabel className="font-semibold text-md">
              Prefrences
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
      </nav>
      <main className="py-4 px-4 flex-1 rounded-xl border"></main>
    </>
  );
}
