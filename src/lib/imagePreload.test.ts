import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preloadImages, _resetImagePreloadCache } from './imagePreload';

interface StubImage {
  src: string;
  decode: ReturnType<typeof vi.fn>;
  onload?: () => void;
  onerror?: () => void;
}

describe('preloadImages', () => {
  const created: StubImage[] = [];

  function stubImage(
    makeDecode: () => StubImage['decode'] | undefined,
  ): unknown {
    return class {
      src = '';
      decode = makeDecode();
      onload: (() => void) | undefined;
      onerror: (() => void) | undefined;
      constructor() {
        created.push(this as unknown as StubImage);
      }
    };
  }

  function install(makeDecode: () => StubImage['decode'] | undefined): void {
    const Ctor = stubImage(makeDecode);
    vi.stubGlobal('Image', Ctor);
    vi.stubGlobal('window', { Image: Ctor });
  }

  beforeEach(() => {
    created.length = 0;
    _resetImagePreloadCache();
    install(() => vi.fn(() => Promise.resolve()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warms and decodes each path exactly once', async () => {
    await preloadImages(['/a.png', '/b.png']);

    expect(created.map((i) => i.src)).toEqual(['/a.png', '/b.png']);
    for (const img of created) {
      expect(img.decode).toHaveBeenCalledTimes(1);
    }
  });

  it('never refetches a path that is already warm', async () => {
    await preloadImages(['/a.png', '/b.png']);
    await preloadImages(['/b.png', '/c.png']);

    expect(created.map((i) => i.src)).toEqual(['/a.png', '/b.png', '/c.png']);
  });

  it('deduplicates repeats within a single call', async () => {
    await preloadImages(['/a.png', '/a.png', '/a.png']);

    expect(created).toHaveLength(1);
  });

  it('resolves rather than rejecting when a decode fails', async () => {
    install(() => vi.fn(() => Promise.reject(new Error('broken image'))));

    await expect(preloadImages(['/bad.png'])).resolves.toBeUndefined();
  });

  it('falls back to load events when decode() is unavailable', async () => {
    install(() => undefined);

    const done = preloadImages(['/a.png']);
    // Nothing settles until the element reports back.
    created[0]?.onload?.();

    await expect(done).resolves.toBeUndefined();
  });

  it('resolves without touching Image outside the browser', async () => {
    vi.stubGlobal('window', undefined);

    await expect(preloadImages(['/a.png'])).resolves.toBeUndefined();
    expect(created).toHaveLength(0);
  });
});
