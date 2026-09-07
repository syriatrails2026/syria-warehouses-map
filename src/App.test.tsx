import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the header, stats toolbar, and national map level on first load', async () => {
    render(<App />);
    expect(screen.getByText('منصة مخازن سوريا')).toBeInTheDocument();
    // "محافظة تجريبية أ" appears both in the always-visible Sidebar list and in the
    // map's own labels, so this asserts at least one render rather than a single match.
    expect((await screen.findAllByText('محافظة تجريبية أ')).length).toBeGreaterThan(0);
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });

  it('drills into a governorate when its map region is clicked, and updates the breadcrumb', async () => {
    render(<App />);
    const featureGroup = await screen.findByTestId('feature-gov-a');
    fireEvent.click(featureGroup);
    expect(await screen.findByText('منطقة أ1')).toBeInTheDocument();
    expect(screen.getAllByText('محافظة تجريبية أ').length).toBeGreaterThan(0);
  });

  it('opens a warehouse card when a pin is clicked at the subdistrict level', async () => {
    window.history.pushState({}, '', '/?gov=gov-a&district=dist-a1&sub=sub-a1a');
    render(<App />);
    // The fixture spreads warehouses evenly across subdistricts (175 each here), so
    // many pins match this testid pattern — click the first one found.
    const pins = await screen.findAllByTestId(/^pin-/);
    fireEvent.click(pins[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح في خرائط جوجل' })).toHaveAttribute('href', expect.stringContaining('https://www.google.com/maps?q='));
  });

  it('returns to the national level when the "سوريا" breadcrumb root is clicked', async () => {
    window.history.pushState({}, '', '/?gov=gov-a');
    render(<App />);
    await screen.findByText('منطقة أ1');
    fireEvent.click(screen.getByText('سوريا'));
    expect((await screen.findAllByText('محافظة تجريبية ب')).length).toBeGreaterThan(0);
  });

  it('closes a stale warehouse card when the browser back button navigates to a different scope', async () => {
    window.history.pushState({}, '', '/?gov=gov-a&district=dist-a1&sub=sub-a1a');
    window.history.pushState({}, '', '/?gov=gov-a&district=dist-a2&sub=sub-a2a');
    render(<App />);
    const pins = await screen.findAllByTestId(/^pin-/);
    fireEvent.click(pins[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Simulate the browser back button: the URL changes to the previous
    // history entry and fires 'popstate' without going through setSelection.
    window.history.replaceState({}, '', '/?gov=gov-a&district=dist-a1&sub=sub-a1a');
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
