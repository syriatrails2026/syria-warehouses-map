import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getWarehouses } from './data/warehouseSource';
import type { Warehouse } from './types/warehouse';

vi.mock('./data/warehouseSource', () => ({
  getWarehouses: vi.fn(),
}));

describe('App data loading state', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.mocked(getWarehouses).mockReset();
  });

  it('shows a loading indicator before warehouse data arrives, then hides it once ready', async () => {
    let resolveLoad: (value: Warehouse[]) => void = () => {};
    vi.mocked(getWarehouses).mockReturnValue(
      new Promise<Warehouse[]>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    render(<App />);
    expect(screen.getByText('جارٍ تحميل بيانات المخازن...')).toBeInTheDocument();

    resolveLoad([]);
    await waitFor(() => expect(screen.queryByText('جارٍ تحميل بيانات المخازن...')).not.toBeInTheDocument());
  });

  it('shows an error state with a retry button when loading fails, and retry can succeed', async () => {
    vi.mocked(getWarehouses).mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce([]);

    render(<App />);
    expect(await screen.findByText('تعذّر تحميل بيانات المخازن')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(screen.queryByText('تعذّر تحميل بيانات المخازن')).not.toBeInTheDocument());
    expect(getWarehouses).toHaveBeenCalledTimes(2);
  });
});
