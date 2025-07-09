import React from "react";

const stats = [
  {
    label: "Annual Revenue",
    value: "$120,000",
    description: "Total revenue for the current year",
  },
  {
    label: "Month Revenue",
    value: "$10,500",
    description: "Revenue generated this month",
  },
  {
    label: "Current Cash",
    value: "$3,200",
    description: "Cash on hand (register)",
  },
  {
    label: "Store Cash",
    value: "$7,800",
    description: "Cash in store safe",
  },
  {
    label: "Total Cash",
    value: "$11,000",
    description: "Sum of all cash sources",
  },
];

export default function Dashboard() {
  return (
    <main className="py-8 px-4 md:px-12 flex-1 min-h-screen bg-background">
      <h1 className="text-3xl font-extrabold mb-8 text-foreground text-center">Stats</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start hover:shadow-lg transition-shadow duration-300"
          >
            <div className="text-muted-foreground text-sm mb-1 font-medium">{stat.label}</div>
            <div className="text-2xl font-bold text-card-foreground mb-2">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.description}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
