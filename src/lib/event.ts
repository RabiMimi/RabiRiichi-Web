export type RabiAction<T> = (obj: T) => void;

export class RabiEvent<T> {
  private readonly listeners: RabiAction<T>[] = [];

  public subscribe(listener: RabiAction<T>): void {
    this.listeners.push(listener);
  }

  public unsubscribe(listener: RabiAction<T>): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  public clear(): void {
    this.listeners.length = 0;
  }

  public emit(value: T): void {
    // Copy the list to avoid issues if listeners unsubscribe during emission
    const targets = [...this.listeners];
    targets.forEach((listener) => listener(value));
  }

  public once(listener: RabiAction<T>): void {
    const onceListener = (value: T) => {
      listener(value);
      this.unsubscribe(onceListener);
    };
    this.subscribe(onceListener);
  }
}
