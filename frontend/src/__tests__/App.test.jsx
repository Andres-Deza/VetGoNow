import { render, screen } from '@testing-library/react';
import App from '../App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('renderiza el logo', () => {
    render(<App />);
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
  });
});
