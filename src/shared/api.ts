/** Contract between the Electron main process and the renderer (exposed by preload). */
export interface ExportFile {
    /** Path relative to the export folder, forward slashes. */
    path: string
    text?: string
    base64?: string
}

export interface Sk2dApi {
    openProject(): Promise<{ path: string; text: string } | null>

    /** Pass path=null to show a "Save as" dialog. Returns the saved path or null if cancelled. */
    saveProject(text: string, path: string | null, suggestedName: string): Promise<string | null>

    /** Asks for a parent folder, creates `folderName` inside it and writes all files. Returns the folder path. */
    exportBundle(folderName: string, files: ExportFile[]): Promise<string | null>
}

declare global {
    interface Window {
        api?: Sk2dApi
    }
}
