/**
 * VS Code API Mock for Unit Testing
 *
 * Provides mock implementations of VS Code APIs used by the extension.
 * This allows testing without running in the VS Code extension host.
 */

import { vi } from 'vitest';

// Mock EventEmitter
export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
          this.listeners.splice(index, 1);
        }
      },
    };
  };

  fire(data: T): void {
    this.listeners.forEach((listener) => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// Mock Uri
export class Uri {
  constructor(
    public readonly scheme: string,
    public readonly authority: string,
    public readonly path: string,
    public readonly query: string,
    public readonly fragment: string
  ) {}

  get fsPath(): string {
    return this.path;
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    const url = new URL(value);
    return new Uri(url.protocol.slice(0, -1), url.host, url.pathname, url.search.slice(1), url.hash.slice(1));
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment
    );
  }
}

// Mock TreeItem
export class TreeItem {
  label?: string;
  id?: string;
  iconPath?: ThemeIcon | Uri;
  description?: string;
  tooltip?: string;
  command?: Command;
  contextValue?: string;
  collapsibleState?: TreeItemCollapsibleState;
  resourceUri?: Uri;

  constructor(label: string | TreeItemLabel, collapsibleState?: TreeItemCollapsibleState) {
    if (typeof label === 'string') {
      this.label = label;
    } else {
      this.label = label.label;
    }
    this.collapsibleState = collapsibleState;
  }
}

export interface TreeItemLabel {
  label: string;
  highlights?: [number, number][];
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

// Mock ThemeIcon
export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor
  ) {}

  static readonly File = new ThemeIcon('file');
  static readonly Folder = new ThemeIcon('folder');
}

// Mock ThemeColor
export class ThemeColor {
  constructor(public readonly id: string) {}
}

// Mock Command interface
export interface Command {
  title: string;
  command: string;
  tooltip?: string;
  arguments?: unknown[];
}

// Mock StatusBarItem
export interface StatusBarItem {
  alignment: StatusBarAlignment;
  priority?: number;
  text: string;
  tooltip?: string;
  color?: string;
  backgroundColor?: ThemeColor;
  command?: string | Command;
  accessibilityInformation?: { label: string; role?: string };
  name?: string;
  show(): void;
  hide(): void;
  dispose(): void;
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

// Mock Progress
export interface Progress<T> {
  report(value: T): void;
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

// Mock workspace
export const workspace = {
  workspaceFolders: [] as WorkspaceFolder[] | undefined,
  getConfiguration: vi.fn((section?: string) => ({
    get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
    has: vi.fn(() => false),
    inspect: vi.fn(),
    update: vi.fn(),
  })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  createFileSystemWatcher: vi.fn(() => ({
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  })),
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    readDirectory: vi.fn(),
  },
};

export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

// Mock window
export const window = {
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  })),
  createStatusBarItem: vi.fn(
    (alignment?: StatusBarAlignment, priority?: number): StatusBarItem => ({
      alignment: alignment ?? StatusBarAlignment.Left,
      priority,
      text: '',
      tooltip: undefined,
      color: undefined,
      backgroundColor: undefined,
      command: undefined,
      accessibilityInformation: undefined,
      name: undefined,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })
  ),
  createTreeView: vi.fn(() => ({
    onDidChangeSelection: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCollapseElement: vi.fn(() => ({ dispose: vi.fn() })),
    onDidExpandElement: vi.fn(() => ({ dispose: vi.fn() })),
    reveal: vi.fn(),
    dispose: vi.fn(),
  })),
  createWebviewPanel: vi.fn(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      postMessage: vi.fn(),
      asWebviewUri: vi.fn((uri: Uri) => uri),
      cspSource: 'https://example.com',
    },
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    reveal: vi.fn(),
    dispose: vi.fn(),
  })),
  withProgress: vi.fn(async <T>(options: unknown, task: (progress: Progress<unknown>) => Promise<T>): Promise<T> => {
    return task({ report: vi.fn() });
  }),
  registerTreeDataProvider: vi.fn(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
};

// Mock commands
export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
  getCommands: vi.fn(() => Promise.resolve([])),
};

// Mock ExtensionContext
export interface ExtensionContext {
  subscriptions: { dispose(): void }[];
  workspaceState: Memento;
  globalState: Memento & { setKeysForSync(keys: string[]): void };
  extensionPath: string;
  extensionUri: Uri;
  storagePath: string | undefined;
  globalStoragePath: string;
  logPath: string;
  extensionMode: ExtensionMode;
  asAbsolutePath(relativePath: string): string;
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
  keys(): readonly string[];
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

// Mock Disposable
export class Disposable {
  constructor(private callOnDispose: () => void) {}

  static from(...disposables: { dispose(): void }[]): Disposable {
    return new Disposable(() => disposables.forEach((d) => d.dispose()));
  }

  dispose(): void {
    this.callOnDispose();
  }
}

// Mock ViewColumn
export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

// Mock ConfigurationTarget
export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

// Mock RelativePattern
export class RelativePattern {
  constructor(
    public base: string | WorkspaceFolder | Uri,
    public pattern: string
  ) {}
}

// Export all mocks
export default {
  EventEmitter,
  Uri,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  ThemeColor,
  StatusBarAlignment,
  ProgressLocation,
  workspace,
  window,
  commands,
  Disposable,
  ViewColumn,
  ConfigurationTarget,
  RelativePattern,
  ExtensionMode,
};
