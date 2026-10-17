export class Emitter<E extends string> {
  private handlers = new Map<E, Set<() => void>>()

  on(event: E, fn: () => void): () => void {
    let set = this.handlers.get(event)
    if (!set) this.handlers.set(event, (set = new Set()))
    set.add(fn)
    return () => set!.delete(fn)
  }

  emit(event: E): void {
    this.handlers.get(event)?.forEach((fn) => fn())
  }
}
