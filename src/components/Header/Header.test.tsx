import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PROJECT_NAME } from '../../config';
import { Header } from './Header';

describe('Header', () => {
  it('renders the configured project name', () => {
    render(<Header onOpenAbout={() => {}} />);
    expect(screen.getByText(PROJECT_NAME)).toBeInTheDocument();
  });

  it('calls onOpenAbout when the "عن المشروع" link is clicked', () => {
    const onOpenAbout = vi.fn();
    render(<Header onOpenAbout={onOpenAbout} />);
    fireEvent.click(screen.getByText('عن المشروع'));
    expect(onOpenAbout).toHaveBeenCalled();
  });
});
