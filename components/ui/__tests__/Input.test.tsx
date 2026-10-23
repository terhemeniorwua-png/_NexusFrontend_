import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders a visible label associated with the input', () => {
    render(<Input id="email" label="Email address" />);
    const input = screen.getByRole('textbox', { name: 'Email address' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'email');
  });

  it('renders a required indicator and sets aria-required', () => {
    render(<Input id="name" label="Name" required />);
    const input = screen.getByRole('textbox', { name: /name/i });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toBeRequired();
  });

  it('shows error message with role=alert and sets aria-invalid', () => {
    render(
      <Input id="email" label="Email" errorMessage="Enter a valid email" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text when no error is present', () => {
    render(<Input id="pw" label="Password" helperText="At least 8 characters" />);
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    // Helper text is not an alert
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides helper text when errorMessage is provided', () => {
    render(
      <Input
        id="pw"
        label="Password"
        helperText="At least 8 characters"
        errorMessage="Too short"
      />,
    );
    expect(screen.queryByText('At least 8 characters')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input id="x" label="Field" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('hides label visually when srOnlyLabel is true', () => {
    render(<Input id="search" label="Search" srOnlyLabel />);
    const label = screen.getByText('Search');
    expect(label.className).toContain('sr-only');
    // The input is still accessible by label
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const handleChange = vi.fn();
    render(<Input id="t" label="Text" onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(handleChange).toHaveBeenCalled();
  });
});
