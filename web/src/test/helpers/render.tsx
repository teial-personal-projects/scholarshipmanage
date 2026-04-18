import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export function renderWithAuth(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    user?: { id: number; email: string; firstName?: string; lastName?: string };
  }
) {
  const mockUser = options?.user || { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' };
  localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: 'mock-jwt-token', refresh_token: 'mock-refresh-token' }));
  localStorage.setItem('user', JSON.stringify(mockUser));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export function cleanupAuth() {
  localStorage.clear();
}

export * from '@testing-library/react';
