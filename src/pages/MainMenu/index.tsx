import { ChartLine, Users, ShoppingCart, CreditCard, Calculator, Settings as AdminIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function MainMenu() {
  const menuItems = [
    { 
      name: "dashboard", 
      icon: ChartLine, 
      description: "Check your progress and business insights",
      color:"text-green-500"
    },
    { 
      name: "cashier", 
      icon: CreditCard, 
      description: "Start working with customers and process transactions" ,
      color:"text-yellow-500"
    },
    { 
      name: "stock", 
      icon: ShoppingCart, 
      description: "Track inventory, manage stock, add purchases/products" ,
      color:"text-blue-500"
    },
    { 
      name: "clients", 
      icon: Users, 
      description: "Add clients, manage debts, payments, and orders" ,
      color:"text-red-500"
    },
    { 
      name: "zakat al mal", 
      icon: Calculator, 
      description: "Calculate and manage Zakat Al Mal contributions",
      color:"text-green-300" 
    },
    { 
      name: "administrator", 
      icon: AdminIcon, 
      description: "Manage your app settings and configurations" ,
      color:"text-orange-500"
    },
  ];

  return (
    <main className="py-4 px-4 md:px-12 flex-1 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {menuItems.map((item) => (
          <Link
            to={`/${item.name.replace(/\s+/g, '-')}`}
            className="group p-6 border rounded-xl bg-card transition-all duration-300 flex flex-col h-full
                      hover:border-red-400 hover:-translate-y-1 hover:shadow-md"
            key={item.name}
          >
            <div className="flex items-center gap-4 mb-3">
              <item.icon size={40} className={`${item.color} transition-colors duration-300 group-hover:text-red-400`}/>
              <h2 className="font-bold capitalize text-lg transition-colors duration-300 group-hover:text-primary">
                {item.name}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm flex-grow transition-colors duration-300 group-hover:text-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}