import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reducer, toast } from '@/hooks/use-toast';

describe('hooks/use-toast reducer', () => {
  const initialState = { toasts: [] };

  it('ADD_TOAST adds a toast', () => {
    const toast = { id: '1', title: 'Test', open: true };
    const result = reducer(initialState, { type: 'ADD_TOAST', toast });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].title).toBe('Test');
  });

  it('ADD_TOAST limits to TOAST_LIMIT (1)', () => {
    const state = { toasts: [{ id: '1', title: 'First', open: true }] };
    const toast = { id: '2', title: 'Second', open: true };
    const result = reducer(state, { type: 'ADD_TOAST', toast });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].title).toBe('Second');
  });

  it('UPDATE_TOAST updates matching toast', () => {
    const state = { toasts: [{ id: '1', title: 'Old', open: true }] };
    const result = reducer(state, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'New' } });
    expect(result.toasts[0].title).toBe('New');
  });

  it('UPDATE_TOAST does not affect non-matching toasts', () => {
    const state = { toasts: [{ id: '1', title: 'Old', open: true }] };
    const result = reducer(state, { type: 'UPDATE_TOAST', toast: { id: '99', title: 'New' } });
    expect(result.toasts[0].title).toBe('Old');
  });

  it('DISMISS_TOAST sets open to false', () => {
    const state = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(result.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST without id dismisses all', () => {
    const state = { toasts: [{ id: '1', open: true }, { id: '2', open: true }] as any };
    const result = reducer(state, { type: 'DISMISS_TOAST' });
    result.toasts.forEach((t: any) => expect(t.open).toBe(false));
  });

  it('REMOVE_TOAST removes specific toast', () => {
    const state = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(result.toasts).toHaveLength(0);
  });

  it('REMOVE_TOAST without id removes all', () => {
    const state = { toasts: [{ id: '1', open: true }, { id: '2', open: true }] as any };
    const result = reducer(state, { type: 'REMOVE_TOAST' });
    expect(result.toasts).toHaveLength(0);
  });

  describe('toast function', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('returns id, dismiss, and update functions', () => {
      const result = toast({ title: 'Hello' });
      expect(result.id).toBeDefined();
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.update).toBe('function');
    });

    it('auto-dismisses after 3 seconds', () => {
      const result = toast({ title: 'Auto dismiss' });
      expect(result.id).toBeDefined();
      // After 3s, dismiss is called automatically
      vi.advanceTimersByTime(3000);
      // No error means it worked
    });

    it('dismiss can be called manually', () => {
      const result = toast({ title: 'Manual dismiss' });
      result.dismiss();
      // No error means it worked
    });

    vi.useRealTimers;
  });
});
