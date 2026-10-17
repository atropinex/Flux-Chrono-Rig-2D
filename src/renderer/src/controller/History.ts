import type {Snapshot} from '../model/types'

export interface HistoryEntry {
    label: string
    before: Snapshot
    after: Snapshot
    /** Entries with the same mergeKey that happen close together collapse into one undo step (drags, typing). */
    mergeKey?: string
    time: number
}

const MERGE_WINDOW_MS = 2000

export class History {
    private undoStack: HistoryEntry[] = []
    private redoStack: HistoryEntry[] = []

    push(entry: HistoryEntry): void {
        const top = this.undoStack[this.undoStack.length - 1]
        if (top && entry.mergeKey && top.mergeKey === entry.mergeKey && entry.time - top.time < MERGE_WINDOW_MS) {
            top.after = entry.after
            top.time = entry.time
        } else {
            this.undoStack.push(entry)
        }
        this.redoStack = []
    }

    undo(): HistoryEntry | undefined {
        const e = this.undoStack.pop()
        if (e) this.redoStack.push(e)
        return e
    }

    redo(): HistoryEntry | undefined {
        const e = this.redoStack.pop()
        if (e) this.undoStack.push(e)
        return e
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0
    }

    get undoLabel(): string | undefined {
        return this.undoStack[this.undoStack.length - 1]?.label
    }

    get redoLabel(): string | undefined {
        return this.redoStack[this.redoStack.length - 1]?.label
    }

    clear(): void {
        this.undoStack = []
        this.redoStack = []
    }
}
