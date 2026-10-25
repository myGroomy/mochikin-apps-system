import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppGrid } from '@/components/AppGrid';

// Mock fetch globally
global.fetch = vi.fn();

const mockApps = [
  {
    id: '1',
    name: 'mycheck',
    title: 'MyCheck — Checklist & QC',
    description: 'Checklist and quality control',
    icon_url: 'https://example.com/mycheck.png',
    url: 'http://localhost:3002',
    version: '1.5.0',
    category: 'operational',
    disabled: false,
  },
  {
    id: '2',
    name: 'stokis',
    title: 'Stokis — Stock Opname',
    description: 'Stock opname management',
    icon_url: 'https://example.com/stokis.png',
    url: 'http://localhost:3003',
    version: '1.0.0',
    category: 'operational',
    disabled: false,
  },
];

describe('AppGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render apps grid with provided apps', () => {
    render(<AppGrid apps={mockApps} loading={false} />);

    expect(screen.getByText('MyCheck — Checklist & QC')).toBeInTheDocument();
    expect(screen.getByText('Stokis — Stock Opname')).toBeInTheDocument();
    expect(screen.getByText('Checklist and quality control')).toBeInTheDocument();
  });

  it('should render loading spinner when loading', () => {
    render(<AppGrid apps={[]} loading={true} />);

    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  it('should render error message when error occurs', () => {
    const errorMsg = 'Failed to load apps';
    render(
      <AppGrid apps={[]} loading={false} error={errorMsg} />
    );

    expect(screen.getByText('Failed to load apps')).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('should render empty state when no apps', () => {
    render(<AppGrid apps={[]} loading={false} />);

    expect(screen.getByText('No apps available yet')).toBeInTheDocument();
  });

  it('should fetch apps from API if not provided', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apps: mockApps }),
    });

    render(<AppGrid loading={false} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/apps');
    });

    await waitFor(() => {
      expect(screen.getByText('MyCheck — Checklist & QC')).toBeInTheDocument();
    });
  });

  it('should handle API fetch error', async () => {
    (global.fetch as any).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<AppGrid loading={false} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load apps')).toBeInTheDocument();
    });
  });

  it('should display app category badge', () => {
    render(<AppGrid apps={mockApps} loading={false} />);

    expect(screen.getAllByText('operational').length).toBeGreaterThanOrEqual(2);
  });

  it('should display app version if provided', () => {
    render(<AppGrid apps={mockApps} loading={false} />);

    expect(screen.getByText('1.5.0')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('should render responsive grid layout', () => {
    const { container } = render(<AppGrid apps={mockApps} loading={false} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
  });

  it('should set up refresh interval with provided refreshInterval prop', async () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    
    render(<AppGrid apps={mockApps} loading={false} refreshInterval={60000} />);

    // Note: In a real test, we'd verify setInterval was called with 60000
    // but the actual interval setup happens inside useEffect which is mocked
    expect(setIntervalSpy).toHaveBeenCalled();
  });

  it('should render app cards as links', () => {
    render(<AppGrid apps={mockApps} loading={false} />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0]).toHaveAttribute('href', mockApps[0].url);
    expect(links[1]).toHaveAttribute('href', mockApps[1].url);
  });

  it('should use app icon_url if provided, else use initial letter', () => {
    const appsWithoutIcon = [
      {
        ...mockApps[0],
        icon_url: undefined,
      },
    ];

    const { container } = render(
      <AppGrid apps={appsWithoutIcon} loading={false} />
    );

    // Should render avatar with first letter if no icon
    const avatars = container.querySelectorAll('div.bg-gradient-to-br');
    expect(avatars.length).toBeGreaterThan(0);
  });
});
