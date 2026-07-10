import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SidebarProvider } from './SidebarProvider';

let statusBarBtn: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('git-buddy-sidebar', sidebarProvider)
    );

    let connectGitHubCommand = vscode.commands.registerCommand('git-buddy.connectGitHub', async () => {
        try {
            const session = await vscode.authentication.getSession('github', ['repo', 'user'], { createIfNone: true });
            if (session) {
                vscode.window.showInformationMessage(`✅ Git Buddy: Connected to GitHub successfully as @${session.account.label}!`);
                return true;
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ GitHub Connection Failed: ${error.message || error}`);
        }
        return false;
    });
    context.subscriptions.push(connectGitHubCommand);

    let pushCommand = vscode.commands.registerCommand('git-buddy.oneClickPush', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Git Buddy: Open a workspace project folder first!');
            return;
        }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const gitFolderPath = path.join(projectRoot, '.git');
        const isNewRepo = !fs.existsSync(gitFolderPath);
        
        // 🎯 FIXED: Explicitly locked to your target repository URL to prevent folder-name conflicts
        const remoteUrl = `https://github.com/SANJAY-N0/git-buddy.git`;

        const session = await vscode.authentication.getSession('github', ['repo', 'user'], { createIfNone: false });
        if (!session) {
            const connectNow = await vscode.window.showWarningMessage(
                'Your GitHub account is not connected yet. Connect now to unlock push access?',
                'Connect GitHub'
            );
            if (connectNow === 'Connect GitHub') {
                const authenticated = await vscode.commands.executeCommand('git-buddy.connectGitHub');
                if (!authenticated) return;
            } else {
                return;
            }
        }

        await vscode.commands.executeCommand('git-buddy-sidebar.focus');
        sidebarProvider.resetPipeline();

        const commitMessage = await vscode.window.showInputBox({
            prompt: 'Enter your target Git Commit Message description',
            value: 'first commit',
            placeHolder: 'e.g., first commit'
        });
        if (!commitMessage) {
            sidebarProvider.resetPipeline();
            refreshStatusBarVisuals();
            return;
        }

        try {
            sidebarProvider.updateStep(0, 'active', 'Writing README asset entries...');
            const readmePath = path.join(projectRoot, 'README.md');
            if (!fs.existsSync(readmePath)) {
                fs.writeFileSync(readmePath, `# Git Buddy Custom Build\n`);
            }
            sidebarProvider.updateStep(0, 'completed', 'README.md verified.');

            if (isNewRepo) {
                // --- FLOW 1: BRAND NEW REPOSITORY FLOW ---
                sidebarProvider.updateStep(1, 'active', 'Running git init command allocations...');
                await execShell('git init', projectRoot);
                sidebarProvider.updateStep(1, 'completed', 'Initialized empty Git repository.');

                sidebarProvider.updateStep(2, 'active', 'Staging README.md core assets...');
                await execShell('git add README.md', projectRoot);
                sidebarProvider.updateStep(2, 'completed', 'Staged README.md file.');

                sidebarProvider.updateStep(3, 'active', 'Generating commit metadata signatures...');
                await execShell(`git commit -m "${commitMessage}" --allow-empty`, projectRoot);
                sidebarProvider.updateStep(3, 'completed', 'Created local history timeline tree.');
                
                await execShell('git branch -M main', projectRoot);
                await execShell(`git remote add origin ${remoteUrl}`, projectRoot);

                sidebarProvider.updateStep(4, 'active', 'Pushing codebase tracking data up to remote stream...');
                await execShell('git push -u origin main --force', projectRoot);
                sidebarProvider.updateStep(4, 'completed', 'Code tracking synchronization complete!');
            } else {
                // --- FLOW 2: EXISTING REPOSITORY FLOW ---
                sidebarProvider.updateStep(1, 'active', 'Inspecting repository tracks...');
                await execShell('git branch -M main', projectRoot);
                try {
                    await execShell(`git remote add origin ${remoteUrl}`, projectRoot);
                } catch {
                    await execShell(`git remote set-url origin ${remoteUrl}`, projectRoot);
                }
                sidebarProvider.updateStep(1, 'completed', 'Verified origin references.');

                sidebarProvider.updateStep(2, 'active', 'Staging working updates...');
                await execShell('git add .', projectRoot);
                sidebarProvider.updateStep(2, 'completed', 'Staged modified file structures.');

                sidebarProvider.updateStep(3, 'active', 'Writing history commit trees...');
                await execShell(`git commit -m "${commitMessage}" --allow-empty`, projectRoot);
                sidebarProvider.updateStep(3, 'completed', 'Created local git history tree.');

                sidebarProvider.updateStep(4, 'active', 'Syncing upstream changes...');
                await execShell('git push -u origin main --force', projectRoot);
                sidebarProvider.updateStep(4, 'completed', 'Remote synchronized correctly!');
            }

            vscode.window.showInformationMessage("🚀 GitBuddy Successful: Sync complete!");

        } catch (err: any) {
            vscode.window.showErrorMessage(`❌ GitBuddy Execution Error: ${err.message || err}`);
        } finally {
            refreshStatusBarVisuals();
        }
    });
    context.subscriptions.push(pushCommand);

    statusBarBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
    statusBarBtn.command = 'git-buddy.oneClickPush';
    statusBarBtn.tooltip = 'Git Buddy: Click to execute your one-click initialization script parameters';
    context.subscriptions.push(statusBarBtn);

    refreshStatusBarVisuals();
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => refreshStatusBarVisuals()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => refreshStatusBarVisuals()));
}

async function refreshStatusBarVisuals() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        statusBarBtn.text = `$(repo) No Workspace $(cloud-upload)`;
        statusBarBtn.show();
        return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const repoName = path.basename(projectRoot);
    let branchName = 'main';
    let hasChanges = false;

    try {
        const gitFolderPath = path.join(projectRoot, '.git');
        if (fs.existsSync(gitFolderPath)) {
            const activeBranch = await execShell('git rev-parse --abbrev-ref HEAD', projectRoot);
            branchName = activeBranch.trim();

            const gitStatus = await execShell('git status --porcelain', projectRoot);
            if (gitStatus.trim().length > 0) {
                hasChanges = true;
            }
        } else {
            branchName = 'uninitialized';
            hasChanges = true;
        }
        statusBarBtn.text = `$(repo) ${repoName}   $(git-branch) ${branchName}${hasChanges ? '*' : ''} $(cloud-upload)`;
    } catch {
        statusBarBtn.text = `$(repo) ${repoName} $(cloud-upload)`;
    }
    statusBarBtn.show();
}

function execShell(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(cmd, { cwd }, (err: cp.ExecException | null, stdout: string, stderr: string) => {
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

export function deactivate() {
    if (statusBarBtn) { statusBarBtn.dispose(); }
}