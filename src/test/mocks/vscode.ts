import * as path from 'path';

// Mock implementations that can be overridden in tests
export const mockState = {
    workspaceFolders: [] as any[] | undefined,
    commands: {} as Record<string, Function>,
    infoMessages: [] as string[],
    errorMessages: [] as string[],
    warningMessages: [] as string[],
    warningResponse: undefined as string | undefined,
    openDialogResponse: undefined as any[] | undefined,
    inputResponse: undefined as string | undefined,
    sessionResponse: undefined as any,
    globalState: new Map<string, any>(),
    workspaceState: new Map<string, any>(),
    statusBarItem: {
        text: '',
        tooltip: '',
        command: '',
        show: () => {},
        dispose: () => {},
    },
    eventListeners: [] as Function[],
};

export function resetMocks() {
    mockState.workspaceFolders = undefined;
    mockState.commands = {};
    mockState.infoMessages = [];
    mockState.errorMessages = [];
    mockState.warningMessages = [];
    mockState.warningResponse = undefined;
    mockState.openDialogResponse = undefined;
    mockState.inputResponse = undefined;
    mockState.sessionResponse = undefined;
    mockState.globalState.clear();
    mockState.workspaceState.clear();
    mockState.statusBarItem.text = '';
    mockState.statusBarItem.tooltip = '';
    mockState.statusBarItem.command = '';
    mockState.eventListeners = [];
}

export enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15
}

export enum StatusBarAlignment {
    Left = 1,
    Right = 2
}

export class Uri {
    constructor(public readonly scheme: string, public readonly authority: string, public readonly path: string, public readonly query: string, public readonly fragment: string) {}

    static file(fsPath: string) {
        return new Uri('file', '', fsPath, '', '');
    }

    static parse(value: string) {
        return new Uri('http', '', value, '', '');
    }

    get fsPath() {
        return this.path;
    }
}

export const window = {
    showInformationMessage: async (message: string, ...items: any[]) => {
        mockState.infoMessages.push(message);
        if (items.includes('Confirm')) return 'Confirm';
        return undefined;
    },
    showErrorMessage: async (message: string) => {
        mockState.errorMessages.push(message);
    },
    showWarningMessage: async (message: string, options: any, ...items: any[]) => {
        mockState.warningMessages.push(message);
        return mockState.warningResponse;
    },
    showInputBox: async (options?: any) => {
        return mockState.inputResponse;
    },
    showOpenDialog: async (options?: any) => {
        return mockState.openDialogResponse;
    },
    withProgress: async (options: any, task: (progress: any, token: any) => Promise<any>) => {
        return task({ report: () => {} }, {});
    },
    createStatusBarItem: (alignment?: StatusBarAlignment, priority?: number) => {
        return mockState.statusBarItem;
    },
    onDidChangeActiveTextEditor: (listener: Function) => {
        mockState.eventListeners.push(listener);
        return { dispose: () => {} };
    },
    registerWebviewViewProvider: (viewId: string, provider: any) => {
        return { dispose: () => {} };
    }
};

export const workspace = {
    get workspaceFolders() {
        return mockState.workspaceFolders;
    },
    onDidChangeWorkspaceFolders: (listener: Function) => {
        mockState.eventListeners.push(listener);
        return { dispose: () => {} };
    }
};

export const commands = {
    registerCommand: (command: string, callback: Function) => {
        mockState.commands[command] = callback;
        return { dispose: () => {} };
    },
    executeCommand: async (command: string, ...args: any[]) => {
        if (mockState.commands[command]) {
            return mockState.commands[command](...args);
        }
    }
};

export const authentication = {
    getSession: async (providerId: string, scopes: string[], options?: any) => {
        if (mockState.sessionResponse === undefined && options && options.createIfNone) {
            // Simulate successful auth if asked to create if none
            return {
                accessToken: 'mock-oauth-token',
                account: { label: 'SANJAY-N0' }
            };
        }
        return mockState.sessionResponse;
    }
};

export const env = {
    openExternal: async (uri: Uri) => {
        return true;
    }
};
