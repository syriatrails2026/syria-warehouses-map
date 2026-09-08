import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

// Real ids from the imported Syria dataset: SY02 حلب (Aleppo) -> SY0202
// الباب (Al Bab) -> SY020200 مركز الباب / SY020206 عريمة.
// See scripts/import-real-geo.mjs and src/data/geoRepository.test.ts.
describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the header, stats toolbar, and national map level on first load', async () => {
    render(<App />);
    expect(screen.getByText('منصة مخازن سوريا')).toBeInTheDocument();
    // "حلب" appears both in the always-visible Sidebar list and in the
    // map's own labels, so this asserts at least one render rather than a single match.
    expect((await screen.findAllByText('حلب')).length).toBeGreaterThan(0);
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });

  it('drills into a governorate when its map region is clicked, and updates the breadcrumb', async () => {
    render(<App />);
    const featureGroup = await screen.findByTestId('feature-SY02');
    fireEvent.click(featureGroup);
    expect(await screen.findByText('الباب')).toBeInTheDocument();
    expect(screen.getAllByText('حلب').length).toBeGreaterThan(0);
  });

  it('opens a warehouse card when a pin is clicked at the subdistrict level', async () => {
    window.history.pushState({}, '', '/?gov=SY02&district=SY0202&sub=SY020206');
    render(<App />);
    // Every real subdistrict gets 5 or 6 generated warehouses (1400 / 272
    // subdistricts), so multiple pins match this testid pattern — click the first.
    const pins = await screen.findAllByTestId(/^pin-/);
    fireEvent.click(pins[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح في خرائط جوجل' })).toHaveAttribute('href', expect.stringContaining('https://www.google.com/maps?q='));
  });

  it('returns to the national level when the "سوريا" breadcrumb root is clicked', async () => {
    window.history.pushState({}, '', '/?gov=SY02');
    render(<App />);
    await screen.findByText('الباب');
    fireEvent.click(screen.getByText('سوريا'));
    // "الباب" only ever renders as a district-level map label (never in the
    // governorate-only Sidebar), so its absence proves we actually left the
    // drilled-in view rather than just re-confirming the always-visible Sidebar.
    expect(screen.queryByText('الباب')).not.toBeInTheDocument();
    expect((await screen.findAllByText('دمشق')).length).toBeGreaterThan(0);
  });

  it('closes a stale warehouse card when the browser back button navigates to a different scope', async () => {
    window.history.pushState({}, '', '/?gov=SY02&district=SY0202&sub=SY020200');
    window.history.pushState({}, '', '/?gov=SY02&district=SY0202&sub=SY020206');
    render(<App />);
    const pins = await screen.findAllByTestId(/^pin-/);
    fireEvent.click(pins[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Simulate the browser back button: the URL changes to the previous
    // history entry and fires 'popstate' without going through setSelection.
    window.history.replaceState({}, '', '/?gov=SY02&district=SY0202&sub=SY020200');
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and closes the "عن المشروع" modal from the header link', () => {
    render(<App />);
    fireEvent.click(screen.getByText('عن المشروع'));
    expect(screen.getByRole('dialog', { name: 'عن المشروع' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('dialog', { name: 'عن المشروع' })).not.toBeInTheDocument();
  });
});
