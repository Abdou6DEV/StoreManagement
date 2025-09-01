interface ProductAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
}

// Color palette for different letters
const colorPalettes = {
  A: ["bg-gradient-to-br from-red-400 to-pink-500", "text-white"],
  B: ["bg-gradient-to-br from-blue-400 to-indigo-500", "text-white"],
  C: ["bg-gradient-to-br from-green-400 to-emerald-500", "text-white"],
  D: ["bg-gradient-to-br from-yellow-400 to-orange-500", "text-white"],
  E: ["bg-gradient-to-br from-purple-400 to-violet-500", "text-white"],
  F: ["bg-gradient-to-br from-teal-400 to-cyan-500", "text-white"],
  G: ["bg-gradient-to-br from-rose-400 to-red-500", "text-white"],
  H: ["bg-gradient-to-br from-indigo-400 to-blue-500", "text-white"],
  I: ["bg-gradient-to-br from-emerald-400 to-green-500", "text-white"],
  J: ["bg-gradient-to-br from-orange-400 to-yellow-500", "text-white"],
  K: ["bg-gradient-to-br from-violet-400 to-purple-500", "text-white"],
  L: ["bg-gradient-to-br from-cyan-400 to-teal-500", "text-white"],
  M: ["bg-gradient-to-br from-red-500 to-rose-500", "text-white"],
  N: ["bg-gradient-to-br from-blue-500 to-indigo-600", "text-white"],
  O: ["bg-gradient-to-br from-green-500 to-emerald-600", "text-white"],
  P: ["bg-gradient-to-br from-yellow-500 to-orange-600", "text-white"],
  Q: ["bg-gradient-to-br from-purple-500 to-violet-600", "text-white"],
  R: ["bg-gradient-to-br from-teal-500 to-cyan-600", "text-white"],
  S: ["bg-gradient-to-br from-rose-500 to-red-600", "text-white"],
  T: ["bg-gradient-to-br from-indigo-500 to-blue-600", "text-white"],
  U: ["bg-gradient-to-br from-emerald-500 to-green-600", "text-white"],
  V: ["bg-gradient-to-br from-orange-500 to-yellow-600", "text-white"],
  W: ["bg-gradient-to-br from-violet-500 to-purple-600", "text-white"],
  X: ["bg-gradient-to-br from-cyan-500 to-teal-600", "text-white"],
  Y: ["bg-gradient-to-br from-red-600 to-rose-600", "text-white"],
  Z: ["bg-gradient-to-br from-blue-600 to-indigo-700", "text-white"],
  // Numbers
  "0": ["bg-gradient-to-br from-gray-400 to-gray-600", "text-white"],
  "1": ["bg-gradient-to-br from-gray-500 to-gray-700", "text-white"],
  "2": ["bg-gradient-to-br from-gray-600 to-gray-800", "text-white"],
  "3": ["bg-gradient-to-br from-gray-700 to-gray-900", "text-white"],
  "4": ["bg-gradient-to-br from-gray-800 to-black", "text-white"],
  "5": ["bg-gradient-to-br from-gray-900 to-black", "text-white"],
  "6": ["bg-gradient-to-br from-black to-gray-800", "text-white"],
  "7": ["bg-gradient-to-br from-black to-gray-700", "text-white"],
  "8": ["bg-gradient-to-br from-black to-gray-600", "text-white"],
  "9": ["bg-gradient-to-br from-black to-gray-500", "text-white"],
};

const sizeClasses = {
  sm: "w-16 h-16 text-lg",
  md: "w-20 h-20 text-xl",
  lg: "w-24 h-24 text-2xl",
  xl: "w-32 h-32 text-3xl",
  "2xl": "w-40 h-40 text-4xl",
  "3xl": "w-48 h-48 text-5xl",
  "4xl": "w-56 h-56 text-6xl",
  "5xl": "w-64 h-64 text-7xl",
};

export function ProductAvatar({
  name,
  size = "md",
  className = "",
}: ProductAvatarProps) {
  // Get the first character and convert to uppercase
  const firstChar = name.charAt(0).toUpperCase();

  // Get color palette for the first character, fallback to a default if not found
  const colors = colorPalettes[firstChar as keyof typeof colorPalettes] || [
    "bg-gradient-to-br from-slate-400 to-slate-600",
    "text-white",
  ];

  // Get size classes
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`${sizeClass} ${colors[0]} ${colors[1]} rounded-lg flex items-center justify-center font-bold shadow-md ${className}`}
    >
      {firstChar}
    </div>
  );
}

export default ProductAvatar;
