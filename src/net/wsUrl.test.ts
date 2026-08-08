import { describe, it, expect } from 'vitest';
import { getPublicWSUrl, getUserWSUrl } from './wsUrl';

describe('wsUrl', () => {
  it('derives public/connect paths from an absolute ws:// base', () => {
    expect(getPublicWSUrl('ws://localhost:5150')).toBe(
      'ws://localhost:5150/ws/public',
    );
    expect(getUserWSUrl('ws://localhost:5150')).toBe(
      'ws://localhost:5150/ws/connect',
    );
  });

  it('preserves the wss:// scheme', () => {
    expect(getPublicWSUrl('wss://play.example.com')).toBe(
      'wss://play.example.com/ws/public',
    );
    expect(getUserWSUrl('wss://play.example.com')).toBe(
      'wss://play.example.com/ws/connect',
    );
  });

  it('defaults a bare host to ws://', () => {
    expect(getPublicWSUrl('localhost:5150')).toBe(
      'ws://localhost:5150/ws/public',
    );
    expect(getUserWSUrl('localhost:5150')).toBe(
      'ws://localhost:5150/ws/connect',
    );
  });

  it('replaces any existing path on the base URL', () => {
    expect(getPublicWSUrl('ws://host:1/ignored')).toBe('ws://host:1/ws/public');
    expect(getUserWSUrl('ws://host:1/ignored')).toBe('ws://host:1/ws/connect');
  });
});
