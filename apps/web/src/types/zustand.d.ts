declare module 'zustand' {
  interface StoreApi<T> {
    (): T
    getState: () => T
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void
    subscribe: (listener: (state: T, prev: T) => void) => () => void
  }

  export function create<T>(initializer: (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T): StoreApi<T>
}
