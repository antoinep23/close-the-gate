import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../src/components/ConfirmModal';

describe('ConfirmModal', () => {
  it('should not render when closed', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Test"
        message="Test message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByText('Test')).toBeNull();
  });

  it('should render when open', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete key"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Delete key')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('should disable confirm button when confirmText is required but not entered', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Confirm deletion"
        confirmText="delete"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
  });

  it('should enable confirm button when confirmText matches', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Confirm deletion"
        confirmText="delete"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('delete');
    fireEvent.change(input, { target: { value: 'delete' } });

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).not.toBeDisabled();
  });

  it('should disable confirm button when checkbox is required but unchecked', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Confirm"
        confirmCheckbox="I understand the consequences"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
  });

  it('should enable confirm when both checkbox and text are satisfied', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Confirm"
        confirmText="delete"
        confirmCheckbox="I understand"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('delete');
    fireEvent.change(input, { target: { value: 'delete' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).not.toBeDisabled();
  });

  it('should call onConfirm when button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(button);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('should call onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    const button = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(button);

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
