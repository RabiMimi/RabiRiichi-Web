import { describe, it, expect } from 'vitest';
import { ClientMessageDto } from './index';

describe('Protobuf Toolchain', () => {
  it('should construct, encode, and decode ClientMessageDto', () => {
    const properties = {
      id: 42,
      respondTo: 10,
    };

    const message = ClientMessageDto.create(properties);
    expect(message.id).toBe(42);
    expect(message.respondTo).toBe(10);

    const buffer = ClientMessageDto.encode(message).finish();
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);

    const decoded = ClientMessageDto.decode(buffer);
    expect(decoded.id).toBe(42);
    expect(decoded.respondTo).toBe(10);
  });
});
