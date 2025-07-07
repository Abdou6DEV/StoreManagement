import { createRoot } from "react-dom/client";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-red-500 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Store Management
        </h1>
        <p className="text-gray-600">
          Welcome to your Electron React app with Tailwind!
        </p>
        <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Get Started
        </button>
      </div>
    </div>
  );
};

const root = createRoot(document.body);
root.render(<App />);
