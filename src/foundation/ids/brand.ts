declare const brandTag: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brandTag]: B };

export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}
