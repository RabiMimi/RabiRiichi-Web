import Enumerable from 'linq';

declare global {
  interface Array<T> {
    E(): Enumerable.IEnumerable<T>;
  }
}

if (Array.prototype.E === undefined) {
  Array.prototype.E = function <T>(): Enumerable.IEnumerable<T> {
    return Enumerable.from(this);
  };
}

export {};
