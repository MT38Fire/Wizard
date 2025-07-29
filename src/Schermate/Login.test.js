// Login.test.js
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Login from './Login';

describe('Login Component', () => {
  const mockOnClose = jest.fn();
  const mockEmit = jest.fn();

  beforeEach(() => {
    render(<Login onClose={mockOnClose} emittit={mockEmit} />);
  });

  it('renders login form by default', () => {
    expect(screen.getByText('Accedi')).toBeInTheDocument();
    expect(screen.getByLabelText('Username:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    fireEvent.click(screen.getByText('Registrati'));
    expect(screen.getByText('Registrati')).toBeInTheDocument();
  });

  it('calls emit function on form submit', () => {
    fireEvent.change(screen.getByLabelText('Username:'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByText('Login'));
    
    expect(mockEmit).toHaveBeenCalledWith({
      action: 'login',
      name: 'testuser',
      password: 'testpass'
    });
  });

  it('allows guest login', () => {
    fireEvent.click(screen.getByText('Accedi come Ospite'));
    expect(mockEmit).toHaveBeenCalledWith({
      action: 'guestLogin',
      name: 'guest',
      password: null
    });
  });
});