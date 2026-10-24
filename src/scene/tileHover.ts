export interface TileHoverNode {
  parent: TileHoverNode | null;
  userData: Record<string, unknown>;
}

/** The nearest tile blocks tiles behind it, even if its face is unknown. */
export function getIntersectedTileTraceId(
  hits: readonly TileHoverNode[],
): number | null {
  for (const hit of hits) {
    let node: TileHoverNode | null = hit;
    while (node) {
      const { traceId, isIdentifiable } = node.userData;
      if (typeof traceId === 'number') {
        return isIdentifiable === true ? traceId : null;
      }
      node = node.parent;
    }
  }
  return null;
}

interface HoverPointer {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
}

/** Inspection follows one touching pointer, regardless of where it started. */
export class TouchTileHoverState {
  private pointerId: number | null = null;
  traceId: number | null = null;

  begin(pointer: HoverPointer): boolean {
    if (
      !pointer.isPrimary ||
      pointer.pointerType === 'mouse' ||
      this.pointerId != null
    ) {
      return false;
    }
    this.pointerId = pointer.pointerId;
    return true;
  }

  ownsPointer(pointerId: number): boolean {
    return this.pointerId === pointerId;
  }

  move(pointerId: number, traceId: number | null): boolean {
    if (!this.ownsPointer(pointerId)) return false;
    this.traceId = traceId;
    return true;
  }

  end(pointerId: number): boolean {
    if (!this.ownsPointer(pointerId)) return false;
    this.clear();
    return true;
  }

  clear(): void {
    this.pointerId = null;
    this.traceId = null;
  }
}
