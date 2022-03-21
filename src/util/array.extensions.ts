import Enumerable from 'linq';

declare global {
  interface Array<T> {
    get E(): Enumerable.IEnumerable<T>;
  }
}

if (Array.prototype.E === undefined) {
  Object.defineProperty(Array.prototype, 'E', {
    get: function <T>(): Enumerable.IEnumerable<T> {
      return Enumerable.from(this);
    },
  });
}

export {};
