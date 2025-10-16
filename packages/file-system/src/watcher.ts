import { createRequire } from "node:module"
import { toDirURL, toNativePath, toPath } from "./path.js"

export const NativeWatcher = createRequire(import.meta.url)("nsfw/build/Release/nsfw.node") as typeof NodeFileWatcher

const enum Default {
	RootDir = "src",
	DistDir = "dist",
	WorkDir = "",
}

export class FSWatcher extends EventTarget {
	constructor(options: FSWatcher.Options) {
		const { config, paths, state } = (super() as never as this).#internal

		paths.workDir = toDirURL(options?.workDir ?? Default.WorkDir)
		paths.rootDir = toDirURL(paths.workDir, options?.rootDir ?? Default.RootDir)

		if (options.signal instanceof AbortSignal) {
			config.signal = options.signal

			if (config.signal.aborted) {
				state.aborted = true
			}
		}

		config.debounceMS = Math.max(1, Number(options.debounceMS) || 250)
	}

	async start(): Promise<void> {
		if (this.aborted) {
			return
		}

		const { config, paths } = this.#internal

		config.watcher = new NativeWatcher(
			toNativePath(paths.rootDir),
			(events) => {
				for (const event of events) {
					const dirURL = toDirURL(event.directory)

					if (event.action === ActionType.RENAMED) {
						this.dispatchEvent(
							new FileChangeEvent(
								"renamed",
								toPath(dirURL, event.newFile),
								toPath(dirURL, event.oldFile),
							),
						)

						continue
					}

					const change =
						event.action === ActionType.CREATED
							? "created"
							: event.action === ActionType.DELETED
								? "deleted"
								: "modified"

					this.dispatchEvent(new FileChangeEvent(change, toPath(dirURL, event.file)))
				}
			},
			{
				debounceMS: config.debounceMS,
				errorCallback: (error) => this.dispatchEvent(new FileErrorEvent(error)),
				excludedPaths: paths.excluded,
			},
		)

		config.signal.addEventListener("abort", () => this.stop(), { once: true })

		await config.watcher.start()
	}

	async stop(): Promise<void> {
		if (this.aborted) {
			return
		}

		const { config } = this.#internal

		return config.watcher.stop()
	}

	get aborted(): boolean {
		return this.#internal.config.signal.aborted
	}

	get rootDir(): string {
		return this.#internal.paths.rootDir.pathname
	}

	get workDir(): string {
		return this.#internal.paths.workDir.pathname
	}

	#internal = {
		config: {
			debounceMS: 250,
			signal: new AbortController().signal,
			watcher: null as never as NodeFileWatcher,
		},
		paths: {
			excluded: [] as string[],
			workDir: toDirURL(Default.WorkDir),
			rootDir: toDirURL(Default.WorkDir, Default.RootDir),
		},
		state: {
			aborted: false,
		},
	}
}

export namespace FSWatcher {
	export interface Options {
		/** Current working directory. */
		workDir?: string

		/** Root directory to watch. */
		rootDir?: string

		/** Abort to stop the watcher */
		signal?: AbortSignal

		/** Debounce for file events (default 250) */
		debounceMS?: number
	}

	export type Event = FileChangeEvent
}

export class FileChangeEvent extends Event {
	constructor(
		public change: FileChangeEvent.Change,
		public path: string,
		public from = null as string | null,
	) {
		super("change")
	}
}

export namespace FileChangeEvent {
	export type Change = "created" | "deleted" | "modified" | "renamed"
}

export class FileErrorEvent extends Event {
	constructor(public error: unknown) {
		super("error")
	}
}

declare class NodeFileWatcher {
	constructor(
		path: string,
		eventCallback: (events: NodeFileWatcher.FileChangeEvent[]) => void,
		options?: Partial<NodeFileWatcher.Options>,
	)

	/** Signals the watcher to pause listening to events and returns a promise when that has happened. */
	pause: () => Promise<void>

	/** Signals the watcher to resume listening to events and returns a promise when that has happened. */
	resume: () => Promise<void>

	/** Signals the watcher to start listening to events and returns a promise when that has happened. */
	start: () => Promise<void>

	/** Signals the watcher to stop listening to events and returns a promise when that has happened. */
	stop: () => Promise<void>

	/** Signals the watcher to update the excluded paths and returns a promise when that has happened. */
	updateExcludedPaths: (excludedPaths: [string]) => Promise<void>
}

namespace NodeFileWatcher {
	export interface Options {
		/** time in milliseconds to debounce the event callback */
		debounceMS?: number
		/** callback to fire in the case of errors */
		errorCallback?: (err: any) => void
		/** paths to be excluded */
		excludedPaths?: string[]
	}

	export type CreatedFileEvent = GenericFileEvent<ActionType.CREATED>
	export type DeletedFileEvent = GenericFileEvent<ActionType.DELETED>
	export type ModifiedFileEvent = GenericFileEvent<ActionType.MODIFIED>
	export type FileChangeEvent = CreatedFileEvent | DeletedFileEvent | ModifiedFileEvent | RenamedFileEvent

	export interface RenamedFileEvent {
		/** the type of event that occurred */
		action: ActionType.RENAMED
		/** the directory before a rename */
		directory: string
		/**  the name of the file before a rename*/
		oldFile: string
		/** the new location of the file(only useful on linux) */
		newDirectory: string
		/** the name of the file after a rename */
		newFile: string
	}

	export interface GenericFileEvent<T extends ActionType> {
		/** the type of event that occurred */
		action: T
		/** the location the event took place */
		directory: string
		/** the name of the file that was changed(Not available for rename events) */
		file: string
	}
}

export const enum ActionType {
	CREATED = 0,
	DELETED = 1,
	MODIFIED = 2,
	RENAMED = 3,
}
