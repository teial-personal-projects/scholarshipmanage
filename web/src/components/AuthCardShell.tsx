import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

const authBenefits: Array<{ icon: LucideIcon; label: string }> = [
  {
    icon: CalendarCheck,
    label: 'Track deadlines and scholarship status',
  },
  {
    icon: UsersRound,
    label: 'Coordinate essays and recommendations',
  },
  {
    icon: FileCheck2,
    label: 'Keep collaborator updates visible',
  },
];

interface AuthCardShellProps {
  badgeLabel: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCardShell({
  badgeLabel,
  title,
  description,
  children,
  footer,
}: AuthCardShellProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F3] px-4 py-8 text-gray-900">
      <main className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
        <section className="relative overflow-hidden bg-brand-50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-brand-800 shadow-sm">
              <CircleDollarSign size={22} strokeWidth={2.4} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold text-brand-900">Scholarship Manage</h1>
              <p className="text-xs font-medium text-gray-600">Application command center</p>
            </div>
          </div>
        </section>

        <section className="px-5 py-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
            <ShieldCheck size={13} aria-hidden="true" />
            {badgeLabel}
          </div>

          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-bold text-gray-950">{title}</h2>
            <p className="text-sm leading-6 text-gray-600">{description}</p>
          </div>

          {children}

          <div className="mt-5 rounded-md border border-gray-200 bg-white px-4 py-3">
            {footer}
          </div>
        </section>

        <section className="border-t border-gray-100 px-5 py-5">
          <h3 className="mb-4 text-sm font-bold text-brand-900">Why use Scholarship Manage?</h3>

          <div className="grid gap-5 sm:grid-cols-[1fr_8.5rem]">
            <div className="space-y-4">
              {authBenefits.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <p className="text-xs font-medium leading-5 text-gray-600">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <div className="rounded-md bg-brand-50 px-4 py-3">
                <div className="mb-4 flex items-center justify-between">
                  <CalendarCheck size={16} className="text-brand-700" aria-hidden="true" />
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                    This week
                  </span>
                </div>
                <p className="text-2xl font-bold text-brand-900">7</p>
                <p className="text-[11px] font-medium text-gray-600">Actions due soon</p>
              </div>

              <div className="rounded-md bg-accent-50 px-4 py-3">
                <div className="mb-4 flex items-center justify-between">
                  <CheckCircle2 size={16} className="text-accent-600" aria-hidden="true" />
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
                    Synced
                  </span>
                </div>
                <p className="text-2xl font-bold text-accent-900">12</p>
                <p className="text-[11px] font-medium text-accent-700/70">Active applications</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
