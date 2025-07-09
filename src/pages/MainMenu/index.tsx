import { ChartLine, Users, ShoppingCart, CreditCard, Calculator, Settings as AdminIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";

export default function MainMenu() {
  const { t } = useTranslation();
  const menuItems = [
    {
      key: "dashboard",
      icon: ChartLine,
      color: "text-green-500",
    },
    {
      key: "cashier",
      icon: CreditCard,
      color: "text-yellow-500",
    },
    {
      key: "stock",
      icon: ShoppingCart,
      color: "text-blue-500",
    },
    {
      key: "clients",
      icon: Users,
      color: "text-red-500",
    },
    {
      key: "zakat",
      icon: Calculator,
      color: "text-green-300",
    },
    {
      key: "administrator",
      icon: AdminIcon,
      color: "text-orange-500",
    },
  ];

  return (
    <main className="py-4 px-4 md:px-12 flex-1 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {menuItems.map((item) => (
          <Link
            to={`/${item.key.replace(/\s+/g, '-')}`}
            className="group p-6 border rounded-xl bg-card transition-all duration-300 flex flex-col h-full
                      hover:border-red-400 hover:-translate-y-1 hover:shadow-md"
            key={item.key}
          >
            <div className="flex items-center gap-4 mb-3">
              <item.icon size={40} className={`${item.color} transition-colors duration-300 group-hover:text-red-400`}/>
              <h2 className="font-bold capitalize text-lg transition-colors duration-300 group-hover:text-primary">
                {t(`mainMenu.${item.key}`)}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm flex-grow transition-colors duration-300 group-hover:text-foreground">
              {t(`mainMenu.${item.key}Desc`)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}