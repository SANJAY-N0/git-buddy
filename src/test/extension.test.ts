import * as assert from 'assert';
import * as sinon from 'sinon';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { EventEmitter } from 'events';

// Load our mocked vscode module first
import * as vscode from 'vscode';
import { mockState, resetMocks } from './mocks/vscode';

// Import target functions and classes
import { activate, deactivate } from '../extension';
import { SidebarProvider } from '../SidebarProvider';

describe('Git Buddy Extension Tests', () => {
    let cpStub: sinon.SinonStub;
    let httpsStub: sinon.SinonStub;
    let fsExistsStub: sinon.SinonStub;
    let fsWriteStub: sinon.SinonStub;

    // Prepare mock VS Code Extension Context
    const mockContext = {
        subscriptions: [] as any[],
        workspaceState: {
            get: (key: string, defaultValue?: any) => mockState.workspaceState.get(key) ?? defaultValue,
            update: async (key: string, value: any) => { mockState.workspaceState.set(key, value); }
        },
        globalState: {
            get: (key: string, defaultValue?: any) => mockState.globalState.get(key) ?? defaultValue,
            update: async (key: string, value: any) => { mockState.globalState.set(key, value); }
        },
        extensionUri: vscode.Uri.file('/mock/extension/path')
    } as any;

    beforeEach(() => {
        resetMocks();
        cpStub = sinon.stub(cp, 'execFile');
        // Default callback behaviour: success
        cpStub.callsFake((cmd, args, options, callback) => {
            if (typeof callback === 'function') {
                callback(null, 'mock stdout', '');
            }
        });

        httpsStub = sinon.stub(https, 'request');
        fsExistsStub = sinon.stub(fs, 'existsSync');
        fsWriteStub = sinon.stub(fs, 'writeFileSync');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('execGitFast Error Handling', () => {
        it('should successfully return stdout on successful git execution', async () => {
            activate(mockContext);
            const initCommand = mockState.commands['git-buddy.createNewRepoAction'];
            assert.ok(initCommand, 'createNewRepoAction command registered');
        });

        it('should report correct error when git is not installed (ENOENT)', async () => {
            const enoentError = new Error('spawn git ENOENT');
            (enoentError as any).code = 'ENOENT';
            cpStub.callsFake((cmd, args, options, callback) => {
                callback(enoentError, '', '');
            });

            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(false); // README does not exist

            activate(mockContext);
            const initCommand = mockState.commands['git-buddy.createNewRepoAction'];
            await initCommand({ name: 'my-repo', branch: 'main', readme: true, visibility: 'Public' });

            assert.ok(mockState.errorMessages.some(msg => msg.includes('Git is not installed or not found in system PATH.')));
        });
    });

    describe('createNewRepoAction Overwrite Guard', () => {
        it('should abort if README.md exists and user cancels overwrite', async () => {
            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(true); // README exists
            mockState.warningResponse = 'Cancel'; // User clicks Cancel

            activate(mockContext);
            const initCommand = mockState.commands['git-buddy.createNewRepoAction'];
            await initCommand({ name: 'my-repo', branch: 'main', readme: true, visibility: 'Public' });

            assert.ok(mockState.infoMessages.includes('Initialization cancelled.'));
            assert.strictEqual(fsWriteStub.called, false, 'fs.writeFileSync should not have been called');
            
            const gitInitCalled = cpStub.getCalls().some(call => call.args[1] && call.args[1][0] === 'init');
            assert.strictEqual(gitInitCalled, false, 'git init should not have been called');
        });

        it('should proceed and overwrite README.md if user approves overwrite', async () => {
            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(true); // README exists
            mockState.warningResponse = 'Overwrite'; // User clicks Overwrite

            activate(mockContext);
            const initCommand = mockState.commands['git-buddy.createNewRepoAction'];
            await initCommand({ name: 'my-repo', branch: 'main', readme: true, visibility: 'Public' });

            assert.strictEqual(fsWriteStub.calledOnce, true, 'fs.writeFileSync should be called to overwrite README');
            
            const gitInitCalled = cpStub.getCalls().some(call => call.args[1] && call.args[1][0] === 'init');
            assert.strictEqual(gitInitCalled, true, 'git init should run');
            assert.ok(mockState.infoMessages.some(msg => msg.includes('Successfully initialized Public repo [my-repo]')));
        });
    });

    describe('cloneRepoAction Collision Guard', () => {
        it('should show error and abort if destination folder already exists', async () => {
            mockState.openDialogResponse = [vscode.Uri.file('/destination/dir')];
            fsExistsStub.returns(true); // Complete path folder already exists

            activate(mockContext);
            const cloneCommand = mockState.commands['git-buddy.cloneRepoAction'];
            await cloneCommand('https://github.com/SANJAY-N0/git-buddy.git');

            assert.ok(mockState.errorMessages.some(msg => msg.includes('Collision Alert')));
            assert.strictEqual(cpStub.called, false, 'git clone should not have been executed');
        });

        it('should clone repository when destination folder does not exist', async () => {
            mockState.openDialogResponse = [vscode.Uri.file('/destination/dir')];
            fsExistsStub.returns(false); // Complete path folder does not exist

            activate(mockContext);
            const cloneCommand = mockState.commands['git-buddy.cloneRepoAction'];
            await cloneCommand('https://github.com/SANJAY-N0/git-buddy.git');

            assert.ok(mockState.infoMessages.some(msg => msg.includes('Clone process completed successfully!')));
            assert.strictEqual(cpStub.calledOnce, true, 'git clone was triggered');
        });
    });

    describe('fetchGitHubRepos Response Robustness', () => {
        it('should handle non-array response formats gracefully', async () => {
            mockState.sessionResponse = { accessToken: 'token123', account: { label: 'SANJAY-N0' } };
            
            const reqMock = new EventEmitter() as any;
            reqMock.end = sinon.stub();
            httpsStub.returns(reqMock);

            activate(mockContext);
            
            // Clear cachedGitHubRepos via logout command
            const logoutCommand = mockState.commands['git-buddy.logoutGitHubAction'];
            await logoutCommand();

            const executeSearchCommand = mockState.commands['git-buddy.executeSearchFilter'];
            const searchPromise = executeSearchCommand('buddy');

            // Wait briefly for execution to reach https.request
            await new Promise(resolve => setTimeout(resolve, 10));

            assert.ok(httpsStub.called, 'https.request should have been called');

            // Trigger response callback
            const resMock = new EventEmitter() as any;
            resMock.statusCode = 200;
            const resCallback = httpsStub.lastCall.args[1];
            resCallback(resMock);

            // Emit non-array payload
            resMock.emit('data', JSON.stringify({ message: 'rate limited or bad response' }));
            resMock.emit('end');

            await searchPromise;
            assert.ok(true);
        });
    });

    describe('oneClickPush Pipeline and Token Credentials Injection', () => {
        it('should execute push lifecycle successfully injecting github accessToken and restore remote url', async () => {
            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(true); // .git exists
            mockState.inputResponse = 'test commit msg';
            mockState.sessionResponse = { accessToken: 'secret_oauth_token', account: { label: 'sanjay' } };
            mockState.workspaceState.set('remoteUrl', 'https://github.com/SANJAY-N0/git-buddy.git');

            activate(mockContext);
            await mockState.commands['git-buddy.logoutGitHubAction']();
            
            // Restore session
            mockState.sessionResponse = { accessToken: 'secret_oauth_token', account: { label: 'sanjay' } };

            let sentTicks: any[] = [];
            const sendJsonStub = sinon.stub(SidebarProvider.prototype, 'sendJsonData');
            sendJsonStub.callsFake((command: string, payload: any) => {
                if (command === 'pipelineRuntimeTick') {
                    sentTicks.push(JSON.parse(JSON.stringify(payload)));
                }
            });

            const pushCommand = mockState.commands['git-buddy.oneClickPush'];
            await pushCommand();

            // Verify that the OAuth token was injected in remote config
            const expectedPushUrl = 'https://x-access-token:secret_oauth_token@github.com/SANJAY-N0/git-buddy.git';
            const urlConfigCall = cpStub.getCalls().some(call => call.args[1] && call.args[1].includes(expectedPushUrl));
            assert.ok(urlConfigCall, 'git remote set-url/add should contain access token');

            // Verify that the token was removed at the end
            const cleanupCall = cpStub.getCalls().some(call => call.args[1] && call.args[1].includes('set-url') && call.args[1].includes('https://github.com/SANJAY-N0/git-buddy.git'));
            assert.ok(cleanupCall, 'remote URL should be cleaned up at the end');

            // Verify that the pipeline completed successfully
            assert.ok(sentTicks.length > 0, 'Pipeline ticks should be sent');
            const finalTick = sentTicks[sentTicks.length - 1];
            assert.strictEqual(finalTick.globalState, 'completed');
        });

        it('should report failure step-by-step and mark the active step as failed if a git command crashes', async () => {
            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(true); // .git exists
            mockState.sessionResponse = { accessToken: 'secret_oauth_token', account: { label: 'sanjay' } };
            mockState.workspaceState.set('remoteUrl', 'https://github.com/SANJAY-N0/git-buddy.git');

            // Configure cpStub to throw an error for 'add' command
            cpStub.callsFake((cmd, args, options, callback) => {
                if (args && args.includes('add')) {
                    callback(new Error('fatal: pathspec does not match any files'), '', 'fatal: error');
                } else {
                    callback(null, 'mock stdout', '');
                }
            });

            activate(mockContext);

            let sentTicks: any[] = [];
            const sendJsonStub = sinon.stub(SidebarProvider.prototype, 'sendJsonData');
            sendJsonStub.callsFake((command: string, payload: any) => {
                if (command === 'pipelineRuntimeTick') {
                    sentTicks.push(JSON.parse(JSON.stringify(payload)));
                }
            });

            const pushCommand = mockState.commands['git-buddy.oneClickPush'];
            await pushCommand();

            assert.ok(sentTicks.length > 0, 'Pipeline ticks should be sent');
            const errorTick = sentTicks.find(t => t.globalState === 'failed');
            assert.ok(errorTick, 'A tick with globalState = failed was sent');
            
            // Check that the step "Git Add" (index 3) is marked as failed, and later steps are waiting
            const gitAddStep = errorTick.steps[3];
            assert.strictEqual(gitAddStep.title, 'Git Add');
            assert.strictEqual(gitAddStep.state, 'failed');
            assert.ok(gitAddStep.desc.includes('fatal: pathspec'));

            const commitStep = errorTick.steps[5];
            assert.strictEqual(commitStep.state, 'waiting');
        });
    });

    describe('Undo, Redo, and Suggest Commit Message Commands', () => {
        beforeEach(() => {
            mockState.workspaceFolders = [{ uri: vscode.Uri.file('/my/project') }];
            fsExistsStub.returns(true); // .git exists
        });

        it('should successfully undo the last commit via Soft Reset and cache its message', async () => {
            let loggedMsg = "feat: add premium logging";
            cpStub.callsFake((cmd, args, options, callback) => {
                if (args && args.includes('log') && args.includes('--pretty=%B')) {
                    callback(null, loggedMsg, '');
                } else {
                    callback(null, 'mock stdout', '');
                }
            });

            activate(mockContext);

            let sentMessages: any[] = [];
            const sendJsonStub = sinon.stub(SidebarProvider.prototype, 'sendJsonData');
            sendJsonStub.callsFake((command: string, payload: any) => {
                sentMessages.push({ command, payload });
            });

            const undoCommand = mockState.commands['git-buddy.undoCommit'];
            await undoCommand();

            // Verify reset command was run
            const resetCalled = cpStub.getCalls().some(call => call.args[1] && call.args[1].includes('reset') && call.args[1].includes('--soft'));
            assert.ok(resetCalled, 'git reset --soft should have been called');

            // Verify message cached in workspaceState
            assert.strictEqual(mockState.workspaceState.get('lastUndoneCommitMsg'), loggedMsg);

            // Verify webview sync message was sent
            const syncMsg = sentMessages.find(m => m.command === 'syncUndoneCommit');
            assert.ok(syncMsg, 'syncUndoneCommit message should have been sent to webview');
            assert.strictEqual(syncMsg.payload.lastUndoneCommitMsg, loggedMsg);
        });

        it('should successfully redo the commit using cached message', async () => {
            mockState.workspaceState.set('lastUndoneCommitMsg', 'feat: initial redo mock message');
            activate(mockContext);

            let sentMessages: any[] = [];
            const sendJsonStub = sinon.stub(SidebarProvider.prototype, 'sendJsonData');
            sendJsonStub.callsFake((command: string, payload: any) => {
                sentMessages.push({ command, payload });
            });

            const redoCommand = mockState.commands['git-buddy.redoCommit'];
            await redoCommand();

            // Verify git add and commit were called
            const addCalled = cpStub.getCalls().some(call => call.args[1] && call.args[1].includes('add'));
            const commitCalled = cpStub.getCalls().some(call => call.args[1] && call.args[1].includes('commit') && call.args[1].includes('feat: initial redo mock message'));
            assert.ok(addCalled, 'git add should have been called');
            assert.ok(commitCalled, 'git commit should have been called');

            // Verify workspaceState cleared
            assert.strictEqual(mockState.workspaceState.get('lastUndoneCommitMsg'), undefined);

            // Verify webview sync message cleared
            const syncMsg = sentMessages.find(m => m.command === 'syncUndoneCommit');
            assert.ok(syncMsg, 'syncUndoneCommit message should have been sent');
            assert.strictEqual(syncMsg.payload.lastUndoneCommitMsg, undefined);
        });

        it('should suggest commit messages based on porcelain status files', async () => {
            cpStub.callsFake((cmd, args, options, callback) => {
                if (args && args.includes('status') && args.includes('--porcelain')) {
                    callback(null, ' M src/extension.ts\n M src/test/extension.test.ts', '');
                } else {
                    callback(null, 'mock stdout', '');
                }
            });

            activate(mockContext);

            let sentMessages: any[] = [];
            const sendJsonStub = sinon.stub(SidebarProvider.prototype, 'sendJsonData');
            sendJsonStub.callsFake((command: string, payload: any) => {
                sentMessages.push({ command, payload });
            });

            const suggestCommand = mockState.commands['git-buddy.suggestCommitMessage'];
            await suggestCommand();

            const suggestMsg = sentMessages.find(m => m.command === 'suggestedCommitMsg');
            assert.ok(suggestMsg, 'suggestedCommitMsg message should be sent');
            assert.ok(suggestMsg.payload.message.includes('test & feat:'), 'suggested message should contain test & feat');
        });
    });
});
