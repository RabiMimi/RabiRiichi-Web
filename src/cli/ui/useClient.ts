/**
 * React hook that re-renders the Ink tree whenever the shared client emits a
 * state change. The `RabiRiichiClient` mutates its own fields in place and
 * signals via `onChange`; components read the client's fields directly and use
 * this hook only as a render trigger.
 */
import { useEffect, useState } from 'react';
import type { RabiRiichiClient } from '../../net/client';

export function useClientState(client: RabiRiichiClient): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    client.onChange.subscribe(rerender);
    return () => {
      client.onChange.unsubscribe(rerender);
    };
  }, [client]);
}
