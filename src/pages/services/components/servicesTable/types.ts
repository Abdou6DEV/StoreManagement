export interface ServiceTableFilters {
  completed: boolean;
  pending: boolean;
  overdue: boolean;
  search: string;
  serviceType: string;
}

export interface ConfirmDeleteState {
  open: boolean;
  serviceId: string | null;
  serviceName: string;
}

