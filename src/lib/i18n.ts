import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      dashboard: {
        title: 'Dashboard',
        annualRevenue: 'Annual Revenue',
        monthRevenue: 'Month Revenue',
        currentCash: 'Current Cash',
        storeCash: 'Store Cash',
        totalCash: 'Total Cash',
        annualRevenueDesc: 'Total revenue for the current year',
        monthRevenueDesc: 'Revenue generated this month',
        currentCashDesc: 'Cash on hand (register)',
        storeCashDesc: 'Cash in store safe',
        totalCashDesc: 'Sum of all cash sources',
      },
      mainMenu: {
        title: 'Main Menu',
        dashboard: 'Dashboard',
        dashboardDesc: 'Check your progress and business insights',
        cashier: 'Cashier',
        cashierDesc: 'Start working with customers and process transactions',
        stock: 'Stock',
        stockDesc: 'Track inventory, manage stock, add purchases/products',
        clients: 'Clients',
        clientsDesc: 'Add clients, manage debts, payments, and orders',
        zakat: 'Zakat Al Mal',
        zakatDesc: 'Calculate and manage Zakat Al Mal contributions',
        administrator: 'Administrator',
        administratorDesc: 'Manage your app settings and configurations',
      },
    },
  },
  fr: {
    translation: {
      dashboard: {
        title: 'Tableau de bord',
        annualRevenue: 'Revenu annuel',
        monthRevenue: 'Revenu du mois',
        currentCash: 'Caisse actuelle',
        storeCash: 'Caisse du magasin',
        totalCash: 'Caisse totale',
        annualRevenueDesc: 'Revenu total pour l\'année en cours',
        monthRevenueDesc: 'Revenu généré ce mois-ci',
        currentCashDesc: 'Argent en caisse (registre)',
        storeCashDesc: 'Argent dans le coffre du magasin',
        totalCashDesc: 'Somme de toutes les sources de liquidités',
      },
      mainMenu: {
        title: 'Menu Principal',
        dashboard: 'Tableau de bord',
        dashboardDesc: 'Consultez vos progrès et les informations commerciales',
        cashier: 'Caisse',
        cashierDesc: 'Travaillez avec les clients et traitez les transactions',
        stock: 'Stock',
        stockDesc: 'Suivez l\'inventaire, gérez le stock, ajoutez des achats/produits',
        clients: 'Clients',
        clientsDesc: 'Ajoutez des clients, gérez les dettes, paiements et commandes',
        zakat: 'Zakat Al Mal',
        zakatDesc: 'Calculez et gérez les contributions de la Zakat Al Mal',
        administrator: 'Administrateur',
        administratorDesc: 'Gérez les paramètres et configurations de l\'application',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 