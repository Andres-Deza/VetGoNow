import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/Login';
import { describe, it, expect } from 'vitest';

describe('Login', () => {
  it('renderiza el formulario de login', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('muestra error si los campos están vacíos', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByText(/campo requerido/i)).toBeInTheDocument();
  });
});
  it('permite login con datos del seed', async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'juan.1@VetGestion.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'usuario1pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  });
