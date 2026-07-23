export function getCallPromptSeatClass(screenPos: number): string {
  switch (screenPos) {
    case 0:
      return 'bottom-[20vh] left-1/2 -translate-x-1/2';
    case 1:
      return 'top-[41%] left-[62%] -translate-x-1/2 -translate-y-1/2';
    case 2:
      return 'top-[22vh] left-1/2 -translate-x-1/2';
    case 3:
      return 'top-[41%] left-[38%] -translate-x-1/2 -translate-y-1/2';
    default:
      return 'bottom-[20vh] left-1/2 -translate-x-1/2';
  }
}
