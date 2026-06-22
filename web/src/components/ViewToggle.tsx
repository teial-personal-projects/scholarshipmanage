import { Grid2X2, List } from 'lucide-react';

import { DASHBOARD_VIEW_STORAGE_KEY, type DashboardView } from '../utils/dashboardView';

interface ViewToggleProps {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
}

const VIEW_OPTIONS: { view: DashboardView; label: string; Icon: typeof List }[] = [
  { view: 'feed', label: 'Board', Icon: List },
  { view: 'grid', label: 'Grid', Icon: Grid2X2 },
];

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const handleChange = (nextView: DashboardView) => {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, nextView);
    onChange(nextView);
  };

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm shrink-0">
      {VIEW_OPTIONS.map(({ view: optionView, label, Icon }) => {
        const isActive = view === optionView;

        return (
          <button
            key={optionView}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
              isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={isActive}
            onClick={() => handleChange(optionView)}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
