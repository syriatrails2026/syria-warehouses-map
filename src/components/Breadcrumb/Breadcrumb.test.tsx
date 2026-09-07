import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('always renders the "سوريا" root item', () => {
    render(<Breadcrumb items={[]} onNavigate={() => {}} />);
    expect(screen.getByText('سوريا')).toBeInTheDocument();
  });

  it('renders each breadcrumb item label', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } },
          { label: 'منطقة أ1', selection: { governorateId: 'gov-a', districtId: 'dist-a1' } },
        ]}
        onNavigate={() => {}}
      />,
    );
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('منطقة أ1')).toBeInTheDocument();
  });

  it('calls onNavigate with the empty selection when the root is clicked', () => {
    const onNavigate = vi.fn();
    render(<Breadcrumb items={[{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }]} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('سوريا'));
    expect(onNavigate).toHaveBeenCalledWith({});
  });

  it('calls onNavigate with that item selection when a breadcrumb item is clicked', () => {
    const onNavigate = vi.fn();
    const items = [{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }];
    render(<Breadcrumb items={items} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('محافظة تجريبية أ'));
    expect(onNavigate).toHaveBeenCalledWith({ governorateId: 'gov-a' });
  });
});
