import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from './AboutModal';

describe('AboutModal', () => {
  it('renders the title and description text', () => {
    render(<AboutModal onClose={() => {}} />);
    expect(screen.getByText('عن المشروع')).toBeInTheDocument();
    expect(screen.getByText(/1,400 مخزن/)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked, but not when the dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
