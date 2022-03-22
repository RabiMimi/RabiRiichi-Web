export function EnumValues(obj: any): any[] {
  return EnumKeys(obj).map((k) => obj[k]);
}

export function EnumKeys(obj: any): string[] {
  return Object.keys(obj).filter((k) => isNaN(+k));
}
