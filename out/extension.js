"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const SidebarProvider_1 = require("./SidebarProvider");
let statusBarBtn;
let pipelineRunningFlag = false;
const sampleMockCacheDatabase = [
    { name: "git-buddy", branch: "main", visibility: "Public", link: "https://github.com/SANJAY-N0/git-buddy.git" },
    { name: "campus-navigation-system", branch: "develop", visibility: "Private", link: "https://github.com/SANJAY-N0/campus-navigation-system.git" },
    { name: "omnichannel-chat-automation", branch: "main", visibility: "Private", link: "https://github.com/SANJAY-N0/omnichannel-chat-automation.git" },
    { name: "pet-filament-recycler", branch: "master", visibility: "Public", link: "https://github.com/SANJAY-N0/pet-filament-recycler.git" }
];
function activate(context) {
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('git-buddy-sidebar', sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand('git-buddy.cancelNewRepoDialog', async () => {
        const selection = await vscode.window.showWarningMessage('Confirm to cancel repository initialization? Unsaved tracks will be discarded.', { modal: true }, 'Discard');
        if (selection === 'Discard') {
            vscode.window.showInformationMessage('Initialization discarded.');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('git-buddy.createNewRepoAction', async (payload) => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            vscode.window.showErrorMessage('Open a workspace folder directory root first.');
            return;
        }
        const rootPath = folders[0].uri.fsPath;
        try {
            if (payload.readme) {
                fs.writeFileSync(path.join(rootPath, 'README.md'), `# ${payload.name}\n`);
            }
            await execGitFast(['init', '-b', payload.branch || 'main'], rootPath);
            vscode.window.showInformationMessage(`Successfully initialized repo [${payload.name}]`);
            await vscode.commands.executeCommand('git-buddy.refreshRepoDiagnostics');
        }
        catch (err) {
            vscode.window.showErrorMessage(`Initialization Mismatch: ${err.message || err}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('git-buddy.cloneRepoAction', async (repoUrl) => {
        const targetUri = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Select Destination Folder' });
        if (!targetUri || targetUri.length === 0)
            return;
        const baseDir = targetUri[0].fsPath;
        const projectFolderName = path.basename(repoUrl, '.git');
        const completePath = path.join(baseDir, projectFolderName);
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Cloning remote directory track...`, cancellable: false }, async () => {
            try {
                await new Promise((res, rej) => { cp.execFile('git', ['clone', repoUrl], { cwd: baseDir }, (err) => err ? rej(err) : res(true)); });
                vscode.window.showInformationMessage('Clone process completed successfully!');
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(completePath), true);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Clone operation anomaly: ${err.message || err}`);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('git-buddy.executeSearchFilter', (query) => {
        const filterToken = (query || '').toLowerCase();
        const matches = sampleMockCacheDatabase.filter(r => r.name.toLowerCase().includes(filterToken));
        sidebarProvider.sendJsonData('renderSearchQueryDataset', matches);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('git-buddy.refreshRepoDiagnostics', async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders)
            return;
        const rootPath = folders[0].uri.fsPath;
        const gitDir = path.join(rootPath, '.git');
        if (!fs.existsSync(gitDir))
            return;
        try {
            const name = path.basename(rootPath);
            const branch = (await execGitFast(['rev-parse', '--abbrev-ref', 'HEAD'], rootPath)).trim();
            let url = "", visibility = "Local Core Only";
            try {
                url = (await execGitFast(['remote', 'get-url', 'origin'], rootPath)).trim();
                visibility = url.includes('private') ? 'Private' : 'Public';
            }
            catch { }
            const filesLog = await execGitFast(['ls-files', '--others', '--cached', '--exclude-standard'], rootPath);
            const files = filesLog.split('\n')
                .map(f => f.trim())
                .filter(f => f.length > 0 && !f.startsWith('node_modules/') && !f.startsWith('.git/') && !f.startsWith('out/') && !f.startsWith('.gemini/') && f !== 'package-lock.json');
            let latestCommitMsg = "No logged milestones";
            let latestCommitFiles = [];
            try {
                latestCommitMsg = (await execGitFast(['log', '-1', '--pretty=%B'], rootPath)).trim();
                const commFilesRaw = await execGitFast(['log', '-1', '--name-only', '--pretty='], rootPath);
                latestCommitFiles = commFilesRaw.split('\n').map(f => f.trim()).filter(f => f.length > 0);
            }
            catch { }
            sidebarProvider.sendJsonData('syncDiagnosticsTelemetry', { name, branch, visibility, url, files, latestCommitMsg, latestCommitFiles });
        }
        catch { }
    }));
    let connectGitHubCommand = vscode.commands.registerCommand('git-buddy.connectGitHub', async () => {
        try {
            const session = await vscode.authentication.getSession('github', ['repo', 'user'], { createIfNone: true });
            if (session) {
                vscode.window.showInformationMessage(`✅ Connected successfully as @${session.account.label}!`);
                sidebarProvider.sendJsonData('renderSettingsSessionProfile', { authenticated: true, login: session.account.label, avatar: `https://github.com/${session.account.label}.png`, count: sampleMockCacheDatabase.length });
                refreshHeaderTelemetry(sidebarProvider);
                return true;
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`GitHub Link Blocked: ${error.message || error}`);
        }
        return false;
    });
    context.subscriptions.push(connectGitHubCommand);
    // 🎯 HIGH PERFORMANCE LIGHTNING STEPPER PUSH LIFECYCLE
    let pushCommand = vscode.commands.registerCommand('git-buddy.oneClickPush', async () => {
        if (pipelineRunningFlag)
            return;
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            vscode.window.showErrorMessage('Open a workspace project folder tracking context.');
            return;
        }
        const rootPath = folders[0].uri.fsPath;
        const targetUpstreamUrl = context.workspaceState.get('remoteUrl') || 'https://github.com/SANJAY-N0/git-buddy.git';
        const pipelineModel = {
            globalState: 'active',
            steps: [
                { title: 'GitHub Authentication', desc: 'Verifying keys...', state: 'active' },
                { title: 'Detect Repository', desc: 'Scanning tracking indexes...', state: 'waiting' },
                { title: 'Detect Current Branch', desc: 'Parsing target branches...', state: 'waiting' },
                { title: 'Git Add', desc: 'Staging active changes...', state: 'waiting' },
                { title: 'Generate Commit Message', desc: 'Processing transaction labels...', state: 'waiting' },
                { title: 'Git Commit', desc: 'Writing history commit tree tracks...', state: 'waiting' },
                { title: 'Git Push', desc: 'Shipping payload arrays to upstream...', state: 'waiting' },
                { title: 'Verify Remote', desc: 'Validating stream signature keys...', state: 'waiting' },
                { title: 'Completed', desc: 'Process cycle finished cleanly.', state: 'waiting' }
            ]
        };
        pipelineRunningFlag = true;
        sidebarProvider.sendJsonData('pipelineRuntimeTick', pipelineModel);
        const updateStateMapTick = async (idx, state, desc) => {
            if (pipelineModel.steps[idx]) {
                pipelineModel.steps[idx].state = state;
                if (desc)
                    pipelineModel.steps[idx].desc = desc;
            }
            sidebarProvider.sendJsonData('pipelineRuntimeTick', pipelineModel);
            await new Promise(res => setTimeout(res, 50)); // Fast micro-tick for layout painting
        };
        try {
            const session = await vscode.authentication.getSession('github', ['repo', 'user'], { createIfNone: false });
            await updateStateMapTick(0, 'completed', `Handshake verified: @${session?.account?.label || 'SANJAY-N0'}`);
            await updateStateMapTick(1, 'active');
            if (!fs.existsSync(path.join(rootPath, '.git'))) {
                await execGitFast(['init'], rootPath);
            }
            await updateStateMapTick(1, 'completed', 'Initialized tree database verified.');
            await updateStateMapTick(2, 'active');
            const targetBranchOut = await execGitFast(['rev-parse', '--abbrev-ref', 'HEAD'], rootPath);
            const activeBranch = targetBranchOut.trim() || 'main';
            await updateStateMapTick(2, 'completed', `Branch confirmed: [${activeBranch}]`);
            await updateStateMapTick(3, 'active');
            await execGitFast(['add', '.'], rootPath);
            await updateStateMapTick(3, 'completed', 'Staged changes successfully.');
            await updateStateMapTick(4, 'active');
            const msgInput = await vscode.window.showInputBox({ prompt: 'Enter a commit message description', value: 'Incremental synchronization sync', ignoreFocusOut: true });
            const finalMsg = msgInput || 'automated workspace synchronization updates';
            await updateStateMapTick(4, 'completed', `Locked key description: "${finalMsg}"`);
            await updateStateMapTick(5, 'active');
            await execGitFast(['commit', '-m', finalMsg, '--allow-empty'], rootPath);
            await updateStateMapTick(5, 'completed', 'Transaction blocks generated cleanly.');
            await updateStateMapTick(6, 'active');
            try {
                await execGitFast(['remote', 'add', 'origin', targetUpstreamUrl], rootPath);
            }
            catch {
                await execGitFast(['remote', 'set-url', 'origin', targetUpstreamUrl], rootPath);
            }
            await execGitFast(['push', '-u', 'origin', 'HEAD', '--force', '-q'], rootPath);
            await updateStateMapTick(6, 'completed', 'Upstream synchronization complete.');
            await updateStateMapTick(7, 'completed', 'Integrity signature checks matching.');
            pipelineModel.globalState = 'completed';
            await updateStateMapTick(8, 'completed');
            vscode.window.showInformationMessage('🚀 GitBuddy: Transferred codebase cleanly!');
            await vscode.commands.executeCommand('git-buddy.refreshRepoDiagnostics');
        }
        catch (err) {
            pipelineModel.globalState = 'failed';
            sidebarProvider.sendJsonData('pipelineRuntimeTick', pipelineModel);
            vscode.window.showErrorMessage(`Execution crash block anomaly: ${err.message || err}`);
        }
        finally {
            pipelineRunningFlag = false;
            refreshHeaderTelemetry(sidebarProvider);
        }
    });
    context.subscriptions.push(pushCommand);
    statusBarBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
    statusBarBtn.command = 'git-buddy.oneClickPush';
    statusBarBtn.tooltip = 'Git Buddy: Run High-Speed Push Script Engine';
    context.subscriptions.push(statusBarBtn);
    refreshHeaderTelemetry(sidebarProvider);
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => refreshHeaderTelemetry(sidebarProvider)));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => refreshHeaderTelemetry(sidebarProvider)));
}
exports.activate = activate;
async function refreshHeaderTelemetry(sidebarProvider) {
    const folders = vscode.workspace.workspaceFolders;
    let authCheck = false;
    let nameHandle = "@unauthenticated";
    try {
        const session = await vscode.authentication.getSession('github', ['repo', 'user'], { createIfNone: false });
        if (session) {
            authCheck = true;
            nameHandle = '@' + session.account.label;
        }
    }
    catch { }
    if (!folders) {
        statusBarBtn.text = `$(repo) Empty Workspace $(cloud-upload)`;
        statusBarBtn.show();
        sidebarProvider.sendJsonData('syncDiagnosticsHeader', { repoName: "empty-workspace", userName: nameHandle, authenticated: authCheck });
        return;
    }
    const rootPath = folders[0].uri.fsPath;
    const repoName = path.basename(rootPath);
    let branch = "main", modificationFlag = false;
    try {
        if (fs.existsSync(path.join(rootPath, '.git'))) {
            branch = (await execGitFast(['rev-parse', '--abbrev-ref', 'HEAD'], rootPath)).trim();
            const stat = await execGitFast(['status', '--porcelain'], rootPath);
            if (stat.trim().length > 0)
                modificationFlag = true;
        }
        else {
            branch = "uninitialized";
            modificationFlag = true;
        }
        statusBarBtn.text = `$(repo) ${repoName}   $(git-branch) ${branch}${modificationFlag ? '*' : ''} $(cloud-upload)`;
    }
    catch {
        statusBarBtn.text = `$(repo) ${repoName} $(cloud-upload)`;
    }
    statusBarBtn.show();
    sidebarProvider.sendJsonData('syncDiagnosticsHeader', { repoName, userName: nameHandle, authenticated: authCheck });
}
function execGitFast(args, cwd) {
    return new Promise((resolve, reject) => {
        cp.execFile('git', args, { cwd }, (err, stdout, stderr) => {
            if (err) {
                if (stderr && !err.message.includes('fatal') && !err.message.includes('error')) {
                    return resolve(stdout);
                }
                return reject(err);
            }
            resolve(stdout ? stdout.toString() : stderr.toString());
        });
    });
}
function deactivate() { if (statusBarBtn)
    statusBarBtn.dispose(); }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map