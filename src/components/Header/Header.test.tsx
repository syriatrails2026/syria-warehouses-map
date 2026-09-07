import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PROJECT_NAME } from '../../config';
import { Header } from './Header';

describe('Header', () => {
  it('renders the configured project name', () => {
    render(<Header />);
    expect(screen.getByText(PROJECT_NAME)).toBeInTheDocument();
  });
});
