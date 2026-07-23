/**
 * Helpers for passing optional color props to Ink's `<Text>` under
 * `exactOptionalPropertyTypes`, which rejects an explicit `undefined` for
 * `color`/`backgroundColor`. These build a props object that simply omits the
 * key when there is no color, so it can be spread onto `<Text>`.
 */
export interface OptionalColorProps {
  color?: string;
  backgroundColor?: string;
}

export function optionalColors(
  color?: string,
  backgroundColor?: string,
): OptionalColorProps {
  const props: OptionalColorProps = {};
  if (color !== undefined) props.color = color;
  if (backgroundColor !== undefined) props.backgroundColor = backgroundColor;
  return props;
}
