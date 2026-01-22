import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PackageSearch, 
  Users, 
  FileText, 
  Wrench 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLowStock } from '../contexts/lowStockContext';
import { useOutOfStock } from '../contexts/outOfStockContext';
import { useStock } from '../contexts/stockContext';
import { useOverduePayments } from '../contexts/overduePaymentsContext';
import { useOverdueBills } from '../contexts/overdueBillsContext';
import { useDueSoonPayments } from '../contexts/dueSoonPaymentsContext';
import { useDueSoonBills } from '../contexts/dueSoonBillsContext';
import { useOverdueServices } from '../contexts/overdueServicesContext';
import { useDueSoonServices } from '../contexts/dueSoonServicesContext';

export interface Notification {
  id: string;
  type: 'outOfStock' | 'lowStock' | 'overduePayment' | 'dueSoonPayment' | 'overdueBill' | 'dueSoonBill' | 'overdueService' | 'dueSoonService';
  count: number;
  message: string;
  path: string;
  action?: string; // For filter actions like 'outOfStock', 'lowStock', 'overdue', etc.
  icon: LucideIcon;
  iconColor: string; // Original page icon color
  importance: 'high' | 'medium'; // high = red, medium = orange
}

export function useNotifications() {
  const { t } = useTranslation();
  const { unseenLowStockCount } = useLowStock();
  const { unseenOutOfStockCount } = useOutOfStock();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount } = useOverduePayments();
  const { unseenOverdueBillsCount } = useOverdueBills();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount } = useDueSoonPayments();
  const { unseenDueSoonBillsCount } = useDueSoonBills();
  const { unseenOverdueServicesCount } = useOverdueServices();
  const { unseenDueSoonServicesCount } = useDueSoonServices();

  // Aggregate all notifications
  const notifications = useMemo<Notification[]>(() => {
    const notifs: Notification[] = [];

    // Out of stock products (Red - High priority) - only show unseen products
    if (unseenOutOfStockCount > 0) {
      notifs.push({
        id: 'outOfStock',
        type: 'outOfStock',
        count: unseenOutOfStockCount,
        message: unseenOutOfStockCount === 1 
          ? t('notifications.oneProductOutOfStock', '1 product is out of stock')
          : t('notifications.productsOutOfStock', '{{count}} products are out of stock', { count: unseenOutOfStockCount }),
        path: '/stock',
        action: 'outOfStock',
        icon: PackageSearch,
        iconColor: 'text-red-600',
        importance: 'high', // Red background
      });
    }

    // Low stock products (Orange - Medium priority)
    if (unseenLowStockCount > 0) {
      notifs.push({
        id: 'lowStock',
        type: 'lowStock',
        count: unseenLowStockCount,
        message: unseenLowStockCount === 1
          ? t('notifications.oneProductLowStock', '1 product is low on stock')
          : t('notifications.productsLowStock', '{{count}} products are low on stock', { count: unseenLowStockCount }),
        path: '/stock',
        action: 'lowStock',
        icon: PackageSearch,
        iconColor: 'text-orange-600',
        importance: 'medium', // Orange background
      });
    }

    // Overdue payments (credits)
    if (unseenOverdueCreditsCount > 0) {
      notifs.push({
        id: 'overdueCredits',
        type: 'overduePayment',
        count: unseenOverdueCreditsCount,
        message: unseenOverdueCreditsCount === 1
          ? t('notifications.oneOverdueCredit', '1 overdue credit payment')
          : t('notifications.overdueCredits', '{{count}} overdue credit payments', { count: unseenOverdueCreditsCount }),
        path: '/clients',
        action: 'overdueCredits',
        icon: Users,
        iconColor: 'text-red-500',
        importance: 'high', // Red background
      });
    }

    // Overdue payments (versements)
    if (unseenOverdueVersementsCount > 0) {
      notifs.push({
        id: 'overdueVersements',
        type: 'overduePayment',
        count: unseenOverdueVersementsCount,
        message: unseenOverdueVersementsCount === 1
          ? t('notifications.oneOverdueVersement', '1 overdue versement payment')
          : t('notifications.overdueVersements', '{{count}} overdue versement payments', { count: unseenOverdueVersementsCount }),
        path: '/clients',
        action: 'overdueVersements',
        icon: Users,
        iconColor: 'text-red-500',
        importance: 'high', // Red background
      });
    }

    // Due soon payments (credits)
    if (unseenDueSoonCreditsCount > 0) {
      notifs.push({
        id: 'dueSoonCredits',
        type: 'dueSoonPayment',
        count: unseenDueSoonCreditsCount,
        message: unseenDueSoonCreditsCount === 1
          ? t('notifications.oneCreditDueSoon', '1 credit payment due soon')
          : t('notifications.creditsDueSoon', '{{count}} credit payments due soon', { count: unseenDueSoonCreditsCount }),
        path: '/clients',
        action: 'dueSoonCredits',
        icon: Users,
        iconColor: 'text-red-500',
        importance: 'medium', // Orange background
      });
    }

    // Due soon payments (versements)
    if (unseenDueSoonVersementsCount > 0) {
      notifs.push({
        id: 'dueSoonVersements',
        type: 'dueSoonPayment',
        count: unseenDueSoonVersementsCount,
        message: unseenDueSoonVersementsCount === 1
          ? t('notifications.oneVersementDueSoon', '1 versement payment due soon')
          : t('notifications.versementsDueSoon', '{{count}} versement payments due soon', { count: unseenDueSoonVersementsCount }),
        path: '/clients',
        action: 'dueSoonVersements',
        icon: Users,
        iconColor: 'text-red-500',
        importance: 'medium', // Orange background
      });
    }

    // Overdue bills
    if (unseenOverdueBillsCount > 0) {
      notifs.push({
        id: 'overdueBills',
        type: 'overdueBill',
        count: unseenOverdueBillsCount,
        message: unseenOverdueBillsCount === 1
          ? t('notifications.oneOverdueBill', '1 overdue bill')
          : t('notifications.overdueBills', '{{count}} overdue bills', { count: unseenOverdueBillsCount }),
        path: '/bills',
        action: 'overdue',
        icon: FileText,
        iconColor: 'text-purple-500',
        importance: 'high', // Red background
      });
    }

    // Due soon bills
    if (unseenDueSoonBillsCount > 0) {
      notifs.push({
        id: 'dueSoonBills',
        type: 'dueSoonBill',
        count: unseenDueSoonBillsCount,
        message: unseenDueSoonBillsCount === 1
          ? t('notifications.oneBillDueSoon', '1 bill due soon')
          : t('notifications.billsDueSoon', '{{count}} bills due soon', { count: unseenDueSoonBillsCount }),
        path: '/bills',
        action: 'dueSoon',
        icon: FileText,
        iconColor: 'text-purple-500',
        importance: 'medium', // Orange background
      });
    }

    // Overdue services
    if (unseenOverdueServicesCount > 0) {
      notifs.push({
        id: 'overdueServices',
        type: 'overdueService',
        count: unseenOverdueServicesCount,
        message: unseenOverdueServicesCount === 1
          ? t('notifications.oneOverdueService', '1 overdue service')
          : t('notifications.overdueServices', '{{count}} overdue services', { count: unseenOverdueServicesCount }),
        path: '/services',
        action: 'overdue',
        icon: Wrench,
        iconColor: 'text-cyan-500',
        importance: 'high', // Red background
      });
    }

    // Due soon services
    if (unseenDueSoonServicesCount > 0) {
      notifs.push({
        id: 'dueSoonServices',
        type: 'dueSoonService',
        count: unseenDueSoonServicesCount,
        message: unseenDueSoonServicesCount === 1
          ? t('notifications.oneServiceDueSoon', '1 service due soon')
          : t('notifications.servicesDueSoon', '{{count}} services due soon', { count: unseenDueSoonServicesCount }),
        path: '/services',
        action: 'dueSoon',
        icon: Wrench,
        iconColor: 'text-cyan-500',
        importance: 'medium', // Orange background
      });
    }

    return notifs;
  }, [
    t,
    unseenOutOfStockCount,
    unseenLowStockCount,
    unseenOverdueCreditsCount,
    unseenOverdueVersementsCount,
    unseenDueSoonCreditsCount,
    unseenDueSoonVersementsCount,
    unseenOverdueBillsCount,
    unseenDueSoonBillsCount,
    unseenOverdueServicesCount,
    unseenDueSoonServicesCount,
  ]);

  const totalCount = useMemo(() => {
    return notifications.reduce((sum, notif) => sum + notif.count, 0);
  }, [notifications]);

  return {
    notifications,
    totalCount,
  };
}
