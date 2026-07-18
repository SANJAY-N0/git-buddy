import * as path from 'path';

const Module = require('module');
const originalResolve = Module._resolveFilename;

// Whenever 'vscode' is requested, redirect to our mock vscode file
Module._resolveFilename = function(request: string, parent: any, isMain: boolean) {
    if (request === 'vscode') {
        return path.resolve(__dirname, 'mocks/vscode.ts');
    }
    return originalResolve.apply(this, arguments);
};
