export type DashboardView = 'feed' | 'grid';

export const DASHBOARD_VIEW_STORAGE_KEY = 'dashboard-view';

export function getStoredDashboardView(): DashboardView {
  if (typeof window === 'undefined') return 'feed';

  const storedView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
  return storedView === 'grid' || storedView === 'feed' ? storedView : 'feed';
}
