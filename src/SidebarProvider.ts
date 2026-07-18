import * as vscode from 'vscode';
import { getNewView } from './views/newView';
import { getSearchView } from './views/searchView';
import { getCurrentView } from './views/currentView';
import { getSettingsView } from './views/settingsView';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'runConnectAuth':
                    await vscode.commands.executeCommand('git-buddy.connectGitHub');
                    break;
                case 'triggerCancelDialog':
                    await vscode.commands.executeCommand('git-buddy.cancelNewRepoDialog');
                    break;
                case 'triggerCreateRepo':
                    await vscode.commands.executeCommand('git-buddy.createNewRepoAction', data.payload);
                    break;
                case 'triggerClone':
                    await vscode.commands.executeCommand('git-buddy.cloneRepoAction', data.payload);
                    break;
                case 'searchQueryChanged':
                    await vscode.commands.executeCommand('git-buddy.executeSearchFilter', data.query);
                    break;
                case 'openExternalUrl':
                    if (data.url) { vscode.env.openExternal(vscode.Uri.parse(data.url)); }
                    break;
                case 'fetchRepoFiles':
                    await vscode.commands.executeCommand('git-buddy.fetchRepoFilesAction', data);
                    break;
                case 'tabChanged':
                    await this._context.workspaceState.update('activeTab', data.tabId);
                    if (data.tabId === 'current') {
                        await vscode.commands.executeCommand('git-buddy.refreshRepoDiagnostics');
                    }
                    break;
                case 'themeChanged':
                    await this._context.globalState.update('selectedTheme', data.theme);
                    break;
                case 'logoutGitHub':
                    await vscode.commands.executeCommand('git-buddy.logoutGitHubAction');
                    break;
                case 'runOneClickPush':
                    await vscode.commands.executeCommand('git-buddy.oneClickPush', data.commitMessage);
                    break;
                case 'requestCommitSuggestion':
                    await vscode.commands.executeCommand('git-buddy.suggestCommitMessage');
                    break;
                case 'triggerUndoCommit':
                    await vscode.commands.executeCommand('git-buddy.undoCommit');
                    break;
                case 'triggerRedoCommit':
                    await vscode.commands.executeCommand('git-buddy.redoCommit');
                    break;
                case 'webviewReady':
                    await vscode.commands.executeCommand('git-buddy.refreshRepoDiagnostics');
                    await vscode.commands.executeCommand('git-buddy.refreshHeaderTelemetryAction');
                    break;
            }
        });
    }

    public sendJsonData(command: string, payload: any) {
        if (this._view) { this._view.webview.postMessage({ command, payload }); }
    }

    private _getHtmlForWebview(webview: vscode.WebviewView['webview']): string {
        const activeTab = this._context.workspaceState.get<string>('activeTab') || 'search';
        const selectedTheme = this._context.globalState.get<string>('selectedTheme') || 'system';

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-card: var(--vscode-sideBar-background, #1e1e2e);
                    --bg-panel: var(--vscode-editor-background, #181825);
                    --accent: #5046e5;
                    --accent-light: rgba(80, 70, 229, 0.15);
                    --text-main: var(--vscode-sideBar-foreground, #cdd6f4);
                    --text-muted: #9399b2;
                    --border-color: var(--vscode-panel-border, #313244);
                    --green-success: #a6e3a1;
                    --yellow-running: #f9e2af;
                }
                body {
                    padding: 10px; font-family: 'Plus Jakarta Sans', var(--vscode-font-family), sans-serif;
                    background-color: var(--bg-card); color: var(--text-main); margin: 0;
                    box-sizing: border-box; display: flex; flex-direction: column; height: 100vh; overflow: hidden;
                }
                body.theme-light {
                    --bg-card: #f3f4f6;
                    --bg-panel: #ffffff;
                    --text-main: #1f2937;
                    --text-muted: #6b7280;
                    --border-color: #e5e7eb;
                }
                body.theme-dark {
                    --bg-card: #1e1e2e;
                    --bg-panel: #181825;
                    --text-main: #cdd6f4;
                    --text-muted: #9399b2;
                    --border-color: #313244;
                }
                
                /* 🎯 Top Diagnostic Tracking Header */
                .diagnostic-header {
                    display: flex; justify-content: space-between; padding-bottom: 8px;
                    font-size: 11px; font-weight: 600; color: var(--text-muted);
                    border-bottom: 1px solid var(--border-color); margin-bottom: 12px;
                }
                .header-val { color: var(--text-main); font-weight: bold; }

                /* 🎯 Side-by-Side Flex Layout Matching Wireframe */
                .wireframe-split-frame { display: flex; flex: 1; gap: 12px; overflow: hidden; }

                /* Left Circular Button Track Column */
                .left-pillar-nav { display: flex; flex-direction: column; gap: 14px; width: 36px; align-items: center; }
                .circle-nav-btn {
                    width: 30px; height: 30px; border-radius: 50%; background: #2e303f;
                    border: 1px solid var(--border-color); cursor: pointer; display: flex;
                    align-items: center; justify-content: center; transition: all 0.2s ease;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                .circle-nav-btn:hover { border-color: var(--text-muted); }
                .circle-nav-btn.active {
                    background: var(--accent); border-color: var(--accent);
                    box-shadow: 0 0 8px var(--accent-light);
                }
                .circle-nav-btn svg { width: 14px; height: 14px; fill: var(--text-muted); }
                .circle-nav-btn.active svg { fill: #ffffff; }

                /* Right Main Panel Workspace Frame */
                .right-display-board {
                    flex: 1; background: var(--bg-panel); border: 1px solid var(--border-color);
                    border-radius: 8px; padding: 12px; box-sizing: border-box;
                    display: flex; flex-direction: column; overflow-y: auto; position: relative;
                }

                /* 🎯 Top Main Search Input Component Bar */
                .search-bar-container { margin-bottom: 12px; width: 100%; }
                .search-input-field {
                    width: 100%; background: var(--vscode-input-background, #313244); color: var(--text-main);
                    border: 1px solid var(--vscode-input-border, #313244); padding: 8px 12px;
                    border-radius: 20px; font-size: 12px; box-sizing: border-box;
                }
                .search-input-field:focus { outline: 1px solid var(--accent); }

                /* Dynamic Display Sub-Panels */
                .tab-panel { display: none; height: 100%; }
                .tab-panel.active { display: block; }
                .form-group { margin-bottom: 12px; }
                .form-label { font-size: 10px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; }
                .workspace-field { width: 100%; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); padding: 6px 8px; border-radius: 4px; font-size: 12px; box-sizing: border-box; }
                
                .toggle-row { display: flex; align-items: center; justify-content: space-between; margin: 12px 0; }
                .switch { position: relative; display: inline-block; width: 34px; height: 20px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #45475a; transition: .3s; border-radius: 20px; }
                .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .slider { background-color: var(--accent); }
                input:checked + .slider:before { transform: translateX(14px); }

                .btn-row { display: flex; gap: 8px; margin-top: 12px; }
                .btn { flex: 1; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; text-align: center; }
                .btn-primary { background: var(--accent); color: white; }
                .btn-secondary { background: #45475a; color: var(--text-main); }

                /* Search Elements Output Listing View Panels */
                .search-item-card { padding: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 8px; cursor: pointer; }
                .search-item-card:hover { background: var(--accent-light); border-color: var(--accent); }
                .detail-card-overlay { background: rgba(0,0,0,0.3); border: 1px solid var(--accent); border-radius: 6px; padding: 10px; margin-top: 10px; font-size: 12px; }
                .meta-badge { display: inline-block; font-size: 9px; padding: 1px 4px; background: #45475a; border-radius: 3px; color: var(--text-main); font-weight: bold; margin-left: 6px; }

                /* Diagnostic Details File Tree Layouts */
                .current-repo-grid { background: rgba(0,0,0,0.15); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 12px; }
                .meta-row { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.02); }
                .file-scroll-stack { max-height: 85px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); font-family: monospace; font-size: 11px; }
                .file-stack-item { padding: 2px 4px; color: var(--text-main); border-bottom: 1px solid rgba(255,255,255,0.02); }
                .profile-avatar { width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--accent); margin-bottom: 8px; }

                /* 🟢 PIPELINE ANIMATED OVERLAY CARD */
                #pipelineOverlayView { display: none; background: var(--bg-panel); border-radius: 8px; padding: 12px; border: 1px solid var(--border-color); margin-top: 6px; }
                .pipe-step-row { display: flex; align-items: flex-start; margin-bottom: 8px; font-size: 11px; position: relative; }
                .pipe-step-row:not(:last-child)::after { content: ''; position: absolute; left: 5px; top: 14px; bottom: -8px; width: 1px; background: var(--border-color); }
                .pipe-dot-icon { margin-right: 8px; font-weight: bold; width: 12px; text-align: center; }
                .state-completed { color: var(--green-success); }
                .state-running { color: var(--yellow-running); animation: pulseText 1.5s infinite alternate; }
                .state-failed { color: #e06c75; }
                .state-waiting { color: #585b70; }
                @keyframes pulseText { from { opacity: 0.5; } to { opacity: 1; } }

                .repo-browser-row { display: grid; grid-template-columns: 20px 1.5fr 1.5fr 1fr; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-color); font-size: 11px; cursor: pointer; }
                .repo-browser-row:hover { background: rgba(255, 255, 255, 0.05); }
                .repo-browser-row.back-row { background: rgba(255, 255, 255, 0.02); }
                .repo-icon { font-size: 12px; display: flex; align-items: center; justify-content: center; }
                .repo-name { color: var(--text-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 4px; }
                .repo-name.dir-link { color: #58a6ff; font-weight: 500; }
                .repo-name.dir-link:hover { text-decoration: underline; }
                .repo-commit { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; padding-left: 8px; }
                .repo-time { color: var(--text-muted); text-align: right; font-size: 10px; }
                .status-changed { color: #f9e2af; font-family: monospace; border-left: 2px solid #f9e2af; padding-left: 6px; }

                /* 🍞 Modern Glassmorphism Toast Styles */
                .toast-notification {
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 500;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    pointer-events: auto;
                    transform: translateY(20px);
                    opacity: 0;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: calc(100% - 24px);
                    box-sizing: border-box;
                }
                .toast-notification.show {
                    transform: translateY(0);
                    opacity: 1;
                }
                .toast-notification.success {
                    background: rgba(166, 227, 161, 0.25);
                    border-color: #a6e3a1;
                    color: #a6e3a1;
                }
                .toast-notification.error {
                    background: rgba(224, 108, 117, 0.25);
                    border-color: #e06c75;
                    color: #e06c75;
                }
                .toast-notification.warning {
                    background: rgba(249, 226, 175, 0.25);
                    border-color: #f9e2af;
                    color: #f9e2af;
                }
                .toast-notification.info {
                    background: rgba(137, 180, 250, 0.25);
                    border-color: #89b4fa;
                    color: #89b4fa;
                }
                .toast-close-btn {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    padding: 0 4px;
                    line-height: 1;
                    opacity: 0.7;
                }
                .toast-close-btn:hover {
                    opacity: 1;
                }
            </style>
        </head>
        <body class="theme-${selectedTheme}">

            <!-- Diagnostic Header Row -->
            <div class="diagnostic-header">
                <div>current rep: <span id="headerRepoName" class="header-val">loading...</span></div>
                <div>username: <span id="headerUserName" class="header-val">-</span></div>
            </div>

            <!-- Split Panel Wireframe Configuration Grid -->
            <div class="wireframe-split-frame">
                
                <!-- Left Column Circular Navigation Icons Pillar -->
                <div class="left-pillar-nav">
                    <div class="circle-nav-btn active" id="btn-search" onclick="switchFrameView('search')" title="Search Hub">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </div>
                    <div class="circle-nav-btn" id="btn-new" onclick="switchFrameView('new')" title="New Repository">
                        <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </div>
                    <div class="circle-nav-btn" id="btn-current" onclick="switchFrameView('current')" title="Current Repository Details">
                        <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    </div>
                    <div class="circle-nav-btn" id="btn-setting" onclick="switchFrameView('setting')" title="Settings Profile Access">
                        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    </div>
                </div>

                <!-- Right Board Display Frame Area Context -->
                <div class="right-display-board">
                    
                    <!-- Top Search Input Bar Component Component Frame Box -->
                    <div class="search-bar-container" id="globalSearchBarFrame">
                        <input type="text" id="workspaceFilterQuery" class="search-input-field" placeholder="Search bar..." onkeyup="dispatchSearchTokenUpdate()" />
                    </div>

                    <!-- Pipeline Execution Display Block (Dynamically Hidden and Cleaned of Progress Bars) -->
                    <div id="pipelineOverlayView">
                        <div class="form-label" style="color:var(--yellow-running);">GitPush Pipeline Execution Tree</div>
                        <div id="pipelineStepsTargetBox"></div>
                    </div>

                    <!-- Modular Views Injected Core Layers -->
                    ${getSearchView()}
                    ${getNewView()}
                    ${getCurrentView()}
                    ${getSettingsView()}

                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let lastAuthSessionState = false;
                let currentSearchResults = [];
                let currentWorkspaceFiles = [];
                let repoBrowserCurrentPath = "";
                let repoBrowserAllFiles = [];
                let curBrowserCurrentPath = "";
                let curBrowserAllFiles = [];
                let cachedUserRepos = [];
                window.focusedRepoSelected = null;

                function saveWebviewState() {
                    const state = {
                        activeTab: document.querySelector('.circle-nav-btn.active')?.id.replace('btn-', '') || 'search',
                        searchQuery: document.getElementById('workspaceFilterQuery')?.value || '',
                        repoFilesFilterQuery: document.getElementById('repoFilesFilterQuery')?.value || '',
                        selectedRepo: window.focusedRepoSelected || null,
                        repoBrowserCurrentPath: repoBrowserCurrentPath,
                        repoBrowserAllFiles: repoBrowserAllFiles,
                        curBrowserCurrentPath: curBrowserCurrentPath,
                        curBrowserAllFiles: curBrowserAllFiles,
                        theme: document.getElementById('themeSelector')?.value || 'system',
                        newRepoName: document.getElementById('newRepoName')?.value || '',
                        newRepoBranch: document.getElementById('newRepoBranch')?.value || 'main',
                        newRepoVisibility: document.getElementById('newRepoVisibility')?.value || 'Public',
                        newRepoReadme: document.getElementById('newRepoReadme')?.checked || false,
                        pipelineCommitMessage: document.getElementById('pipelineCommitMessage')?.value || '',
                        lastUndoneCommitMsg: document.getElementById('btnRedoCommit')?.getAttribute('title')?.replace('Redo commit: "', '')?.replace('"', '') || ''
                    };
                    vscode.setState(state);
                }

                function restoreWebviewState() {
                    const state = vscode.getState();
                    if (!state) return;
                    
                    if (state.theme) {
                        const selector = document.getElementById('themeSelector');
                        if (selector) selector.value = state.theme;
                        changeTheme(state.theme);
                    }
                    
                    if (document.getElementById('newRepoName')) document.getElementById('newRepoName').value = state.newRepoName || '';
                    if (document.getElementById('newRepoBranch')) document.getElementById('newRepoBranch').value = state.newRepoBranch || 'main';
                    if (document.getElementById('newRepoVisibility')) document.getElementById('newRepoVisibility').value = state.newRepoVisibility || 'Public';
                    if (document.getElementById('newRepoReadme')) document.getElementById('newRepoReadme').checked = state.newRepoReadme !== false;
                    
                    if (state.pipelineCommitMessage) {
                        const pm = document.getElementById('pipelineCommitMessage');
                        if (pm) pm.value = state.pipelineCommitMessage;
                    }
                    if (state.lastUndoneCommitMsg) {
                        const rb = document.getElementById('btnRedoCommit');
                        if (rb) {
                            rb.style.display = 'inline-flex';
                            rb.setAttribute('title', 'Redo commit: "' + state.lastUndoneCommitMsg + '"');
                        }
                    }

                    if (state.activeTab) {
                        switchFrameView(state.activeTab);
                    }
                    
                    if (state.searchQuery) {
                        const searchInput = document.getElementById('workspaceFilterQuery');
                        if (searchInput) {
                            searchInput.value = state.searchQuery;
                            dispatchSearchTokenUpdate();
                        }
                    }
                    
                    if (state.selectedRepo) {
                        window.focusedRepoSelected = state.selectedRepo;
                        renderTargetSelectionCard(state.selectedRepo);
                        repoBrowserAllFiles = state.repoBrowserAllFiles || [];
                        repoBrowserCurrentPath = state.repoBrowserCurrentPath || "";
                        renderRepoBrowser();
                        
                        if (state.repoFilesFilterQuery) {
                            const repoFilter = document.getElementById('repoFilesFilterQuery');
                            if (repoFilter) {
                                repoFilter.value = state.repoFilesFilterQuery;
                                renderRepoBrowser();
                            }
                        }
                    }

                    if (state.curBrowserAllFiles) {
                        curBrowserAllFiles = state.curBrowserAllFiles || [];
                        curBrowserCurrentPath = state.curBrowserCurrentPath || "";
                        renderCurBrowser();
                    }
                }

                function changeTheme(theme) {
                    document.body.className = '';
                    if (theme === 'light') {
                        document.body.classList.add('theme-light');
                    } else if (theme === 'dark') {
                        document.body.classList.add('theme-dark');
                    } else {
                        document.body.classList.add('theme-system');
                    }
                    saveWebviewState();
                    vscode.postMessage({ command: 'themeChanged', theme: theme });
                }

                function validateNewRepoName() {
                    const name = document.getElementById('newRepoName').value.trim().toLowerCase();
                    const warning = document.getElementById('newRepoWarning');
                    const exists = cachedUserRepos.some(r => r.name.toLowerCase() === name);
                    if (exists) {
                        warning.style.display = 'block';
                    } else {
                        warning.style.display = 'none';
                    }
                    saveWebviewState();
                }

                switchFrameView('${activeTab}');

                function switchFrameView(tabId) {
                    document.querySelectorAll('.circle-nav-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                    
                    const targetBtn = document.getElementById('btn-' + tabId);
                    const targetPanel = document.getElementById('panel-' + tabId);
                    
                    if (targetBtn && targetPanel) {
                        targetBtn.classList.add('active');
                        targetPanel.classList.add('active');
                    }

                    const searchBar = document.getElementById('globalSearchBarFrame');
                    if (tabId === 'search') {
                        searchBar.style.display = 'block';
                    } else {
                        searchBar.style.display = 'none';
                    }

                    vscode.postMessage({ command: 'tabChanged', tabId: tabId });
                    saveWebviewState();
                }

                function dispatchSearchTokenUpdate() {
                    const val = document.getElementById('workspaceFilterQuery').value;
                    vscode.postMessage({ command: 'searchQueryChanged', query: val });
                    saveWebviewState();
                }

                function triggerCancelWorkflow() {
                    vscode.postMessage({ command: 'triggerCancelDialog' });
                }

                function submitRepositoryCreation() {
                    const name = document.getElementById('newRepoName').value.trim();
                    const branch = document.getElementById('newRepoBranch').value.trim();
                    const readme = document.getElementById('newRepoReadme').checked;
                    const visibility = document.getElementById('newRepoVisibility').value;
                    const exists = cachedUserRepos.some(r => r.name.toLowerCase() === name.toLowerCase());
                    if(!name || exists) return;
                    vscode.postMessage({ command: 'triggerCreateRepo', payload: { name, branch, readme, visibility } });
                }

                function renderSettingsRepoList(reposList) {
                    const settingsRepoList = document.getElementById('settingsRepoList');
                    if (!settingsRepoList) return;
                    if (reposList && reposList.length) {
                        settingsRepoList.innerHTML = reposList.map(r => {
                            const lang = (r.name.includes('buddy') || r.name.includes('ts')) ? 'TypeScript' :
                                         (r.name.includes('navigation') ? 'Java' :
                                         (r.name.includes('automation') ? 'Python' : 'JavaScript'));
                            const langColor = lang === 'TypeScript' ? '#3178c6' :
                                              lang === 'Java' ? '#b07219' :
                                              lang === 'Python' ? '#3572A5' : '#f1e05a';
                            const updatedStr = r.name.includes('buddy') ? 'Updated 20 minutes ago' :
                                               r.name.includes('test') ? 'Updated 24 minutes ago' :
                                               'Updated 2 days ago';
                                               
                            return '<div class="repo-item-row" onclick="selectRepoFromSettings(\\'' + r.name + '\\')" style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer;">' +
                                '<div style="flex: 1; min-width: 0; padding-right: 8px;">' +
                                    '<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">' +
                                        '<span class="repo-item-title" style="color: #58a6ff; font-weight: 600; font-size: 13px; text-decoration: none;">' + r.name + '</span>' +
                                        '<span style="font-size: 9px; padding: 1px 6px; border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-muted); font-weight: 500; background: rgba(255,255,255,0.03);">' + r.visibility + '</span>' +
                                    '</div>' +
                                    '<div style="display: flex; align-items: center; gap: 10px; font-size: 10px; color: var(--text-muted);">' +
                                        '<span style="display: inline-flex; align-items: center; gap: 4px;">' +
                                            '<span style="width: 8px; height: 8px; border-radius: 50%; background-color: ' + langColor + ';"></span>' +
                                            lang +
                                        '</span>' +
                                        '<span>' + updatedStr + '</span>' +
                                    '</div>' +
                                '</div>' +
                                '<div>' +
                                    '<button class="btn" style="font-size: 10px; padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: #21262d; border: 1px solid var(--border-color); color: #c9d1d9;">' +
                                        '<svg aria-hidden="true" height="12" viewBox="0 0 16 16" version="1.1" width="12" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694z"></path></svg>' +
                                        'Star' +
                                    '</button>' +
                                '</div>' +
                            '</div>';
                        }).join('');
                    } else {
                        settingsRepoList.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">No repositories found</div>';
                    }
                }

                function filterSettingsRepos() {
                    const query = (document.getElementById('settingsRepoQuery')?.value || '').toLowerCase();
                    const selects = document.querySelectorAll('#authenticatedView select');
                    const typeFilter = selects[0]?.value || 'all';
                    const langFilter = selects[1]?.value || 'all';
                    const sortFilter = selects[2]?.value || 'updated';

                    let filtered = cachedUserRepos.filter(r => {
                        const nameMatches = r.name.toLowerCase().includes(query);
                        const typeMatches = typeFilter === 'all' || r.visibility.toLowerCase() === typeFilter;
                        
                        const lang = (r.name.includes('buddy') || r.name.includes('ts')) ? 'typescript' :
                                     (r.name.includes('navigation') ? 'java' :
                                     (r.name.includes('automation') ? 'python' : 'javascript'));
                        const langMatches = langFilter === 'all' || lang === langFilter;
                        
                        return nameMatches && typeMatches && langMatches;
                    });

                    if (sortFilter === 'name') {
                        filtered.sort((a, b) => a.name.localeCompare(b.name));
                    }
                    renderSettingsRepoList(filtered);
                }

                function selectRepoFromSettings(repoName) {
                    const repo = cachedUserRepos.find(r => r.name === repoName);
                    if (repo) {
                        renderTargetSelectionCard(repo);
                        vscode.postMessage({
                            command: 'fetchRepoFiles',
                            owner: repo.owner,
                            name: repo.name,
                            branch: repo.branch
                        });
                        switchFrameView('search');
                    }
                }

                window.addEventListener('message', event => {
                    const msg = event.data;
                    switch(msg.command) {
                        case 'showNotification':
                            showToast(msg.payload.message, msg.payload.type);
                            break;

                        case 'suggestedCommitMsg':
                            const commitField = document.getElementById('pipelineCommitMessage');
                            if (commitField && msg.payload.message) {
                                commitField.value = msg.payload.message;
                                saveWebviewState();
                                showToast('Commit message suggested!', 'success');
                            }
                            break;

                        case 'syncUndoneCommit':
                            const redoButton = document.getElementById('btnRedoCommit');
                            if (redoButton) {
                                if (msg.payload.lastUndoneCommitMsg) {
                                    redoButton.style.display = 'inline-flex';
                                    redoButton.setAttribute('title', 'Redo commit: "' + msg.payload.lastUndoneCommitMsg + '"');
                                } else {
                                    redoButton.style.display = 'none';
                                    redoButton.removeAttribute('title');
                                }
                            }
                            saveWebviewState();
                            break;

                        case 'syncDiagnosticsHeader':
                            document.getElementById('headerRepoName').innerText = msg.payload.repoName;
                            document.getElementById('headerUserName').innerText = msg.payload.userName;
                            
                            if (!msg.payload.authenticated) {
                                lastAuthSessionState = false;
                                switchFrameView('setting');
                            } else if (!lastAuthSessionState) {
                                lastAuthSessionState = true;
                                switchFrameView('search');
                            }
                            break;

                        case 'renderSettingsSessionProfile':
                            const unauth = document.getElementById('unauthenticatedView');
                            const auth = document.getElementById('authenticatedView');
                            if (msg.payload.authenticated) {
                                unauth.style.display = 'none';
                                auth.style.display = 'block';
                                document.getElementById('githubAvatar').src = msg.payload.avatar;
                                document.getElementById('githubUserHandle').innerText = '@' + msg.payload.login;
                                document.getElementById('githubRepoCount').innerText = 'Active Repositories: ' + msg.payload.count;
                                
                                cachedUserRepos = msg.payload.repos || [];
                                validateNewRepoName();
                                filterSettingsRepos();
                            } else {
                                unauth.style.display = 'block';
                                auth.style.display = 'none';
                                cachedUserRepos = [];
                                validateNewRepoName();
                                renderSettingsRepoList([]);
                            }
                            break;

                        case 'renderRepoFilesDetails':
                            repoBrowserAllFiles = msg.payload.files || [];
                            repoBrowserCurrentPath = "";
                            renderRepoBrowser();
                            break;

                        case 'renderSearchQueryDataset':
                            currentSearchResults = msg.payload || [];
                            const outputBox = document.getElementById('searchFrameOutput');
                            outputBox.innerHTML = msg.payload.map((r, i) => 
                                '<div class="search-item-card" onclick="renderTargetSelectionCardByIndex(' + i + ')">' +
                                    '<b>' + r.name + '</b> <span class="meta-badge">' + r.visibility + '</span>' +
                                    '<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">' + r.link + '</div>' +
                                '</div>'
                            ).join('');
                            break;

                        case 'syncDiagnosticsTelemetry':
                            document.getElementById('curName').innerText = msg.payload.name;
                            document.getElementById('curBranch').innerText = msg.payload.branch;
                            document.getElementById('curVisibility').innerText = msg.payload.visibility;
                            
                            curBrowserAllFiles = msg.payload.files || [];
                            renderCurBrowser();
                            
                            document.getElementById('curCommitTitle').innerText = msg.payload.latestCommitMsg || "No commit records";
                            const commBox = document.getElementById('curCommitFiles');
                            commBox.innerHTML = msg.payload.latestCommitFiles.length ? msg.payload.latestCommitFiles.map(f => '<div class="file-stack-item">' + f + '</div>').join('') : '<div style="color:var(--text-muted); padding:4px;">-</div>';
                            
                            const changedBox = document.getElementById('curChangedFiles');
                            if (changedBox) {
                                changedBox.innerHTML = msg.payload.changedFiles && msg.payload.changedFiles.length ? msg.payload.changedFiles.map(f => '<div class="file-stack-item status-changed">' + f + '</div>').join('') : '<div style="color:var(--text-muted); padding:4px;">No pending changes</div>';
                            }

                            const btnOpen = document.getElementById('btnOpenGitHubExternal');
                            btnOpen.onclick = () => { if(msg.payload.url) vscode.postMessage({ command: 'openExternalUrl', url: msg.payload.url }); };
                            break;

                        case 'pipelineRuntimeTick':
                            const pView = document.getElementById('pipelineOverlayView');
                            if (msg.payload.globalState === 'active') {
                                pView.style.display = 'block';
                            } else {
                                pView.style.display = 'none';
                            }

                            // 🎯 Progress Bar Clean Alignment Strategy: Align checks explicitly using symbols, skipping heavy progress bars
                            const rootBox = document.getElementById('pipelineStepsTargetBox');
                            rootBox.innerHTML = msg.payload.steps.map(s => {
                                let styleCls = 'state-waiting';
                                let symbol = '○';
                                if (s.state === 'completed') { styleCls = 'state-completed'; symbol = '✓'; }
                                else if (s.state === 'active') { styleCls = 'state-running'; symbol = '●'; }
                                else if (s.state === 'failed') { styleCls = 'state-failed'; symbol = '✗'; }
                                return '<div class="pipe-step-row ' + styleCls + '">' +
                                    '<div class="pipe-dot-icon">' + symbol + '</div>' +
                                    '<div>' +
                                        '<div style="font-weight:600;">' + s.title + '</div>' +
                                        '<div style="font-size:9px; color:var(--text-muted);">' + s.desc + '</div>' +
                                    '</div>' +
                                '</div>';
                            }).join('');
                            break;
                    }
                });

                function getDirectoryContents(files, currentPath) {
                    if (!files) return [];
                    const contents = new Map();
                    for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        if (currentPath && !f.startsWith(currentPath + "/")) continue;
                        const relativePath = currentPath ? f.substring(currentPath.length + 1) : f;
                        const parts = relativePath.split('/');
                        const name = parts[0];
                        if (parts.length > 1) {
                            contents.set(name, { name: name, isDirectory: true, path: currentPath ? currentPath + "/" + name : name });
                        } else {
                            contents.set(name, { name: name, isDirectory: false, path: f });
                        }
                    }
                    return Array.from(contents.values()).sort((a, b) => {
                        if (a.isDirectory && !b.isDirectory) return -1;
                        if (!a.isDirectory && b.isDirectory) return 1;
                        return a.name.localeCompare(b.name);
                    });
                }

                function navigateRepoBrowserInto(path) {
                    repoBrowserCurrentPath = path;
                    renderRepoBrowser();
                }

                function navigateRepoBrowserBack() {
                    if (!repoBrowserCurrentPath) return;
                    const parts = repoBrowserCurrentPath.split('/');
                    parts.pop();
                    repoBrowserCurrentPath = parts.join('/');
                    renderRepoBrowser();
                }

                function renderRepoBrowser() {
                    const listContainer = document.getElementById('detailRepoFiles');
                    if (!listContainer) return;

                    if (!listContainer.hasAttribute('data-has-listener')) {
                        listContainer.setAttribute('data-has-listener', 'true');
                        listContainer.addEventListener('click', (e) => {
                            const row = e.target.closest('.repo-browser-row');
                            if (!row) return;
                            const isDir = row.getAttribute('data-is-dir') === 'true';
                            const path = row.getAttribute('data-path');
                            const isBack = row.classList.contains('back-row');
                            
                            if (isBack) {
                                navigateRepoBrowserBack();
                            } else if (isDir && path) {
                                navigateRepoBrowserInto(path);
                            }
                        });
                    }
                    
                    const queryInput = document.getElementById('repoFilesFilterQuery');
                    const query = (queryInput ? queryInput.value : '').trim().toLowerCase();
                    
                    const filesList = repoBrowserAllFiles || [];
                    if (query) {
                        const filtered = filesList.filter(f => f.toLowerCase().includes(query));
                        const html = filtered.map(f => {
                            return '<div class="repo-browser-row">' +
                                '<span class="repo-icon">📄</span>' +
                                '<span class="repo-name" style="font-size:11px;">' + f + '</span>' +
                                '<span class="repo-commit">matched search</span>' +
                                '<span class="repo-time">now</span>' +
                            '</div>';
                        }).join('');
                        listContainer.innerHTML = html || '<div style="color:var(--text-muted); padding:12px; text-align:center;">No matching files</div>';
                        return;
                    }
                    
                    const items = getDirectoryContents(filesList, repoBrowserCurrentPath);
                    
                    let html = '';
                    if (repoBrowserCurrentPath) {
                        html += '<div class="repo-browser-row back-row">' +
                            '<span class="repo-icon">📁</span>' +
                            '<span class="repo-name" style="color: var(--accent);">..</span>' +
                            '<span class="repo-commit">go back</span>' +
                            '<span class="repo-time"></span>' +
                        '</div>';
                    }
                    
                    html += items.map(item => {
                        const icon = item.isDirectory ? '📁' : '📄';
                        const commitMsg = item.isDirectory ? 'nothing' : (item.name === 'README.md' ? 'Incremental synchronization sync' : 'updated');
                        const timeVal = 'yesterday';
                        
                        return '<div class="repo-browser-row" data-is-dir="' + item.isDirectory + '" data-path="' + item.path + '">' +
                            '<span class="repo-icon">' + icon + '</span>' +
                            '<span class="repo-name ' + (item.isDirectory ? 'dir-link' : '') + '">' + item.name + '</span>' +
                            '<span class="repo-commit">' + commitMsg + '</span>' +
                            '<span class="repo-time">' + timeVal + '</span>' +
                        '</div>';
                    }).join('');
                    
                    listContainer.innerHTML = html || '<div style="color:var(--text-muted); padding:12px; text-align:center;">Empty directory</div>';
                }

                function renderTargetSelectionCardByIndex(idx) {
                    const repo = currentSearchResults[idx];
                    if (!repo) return;
                    renderTargetSelectionCard(repo);
                    vscode.postMessage({
                        command: 'fetchRepoFiles',
                        owner: repo.owner,
                        name: repo.name,
                        branch: repo.branch
                    });
                }

                function renderTargetSelectionCard(repo) {
                    window.focusedRepoSelected = repo;
                    const card = document.getElementById('searchDetailCard');
                    card.style.display = 'block';
                    card.innerHTML = 
                        '<div class="form-label" style="color:var(--accent);">Focused Upstream Repository</div>' +
                        '<div style="font-weight:bold; font-size:13px; margin-bottom:4px;">' + repo.name + '</div>' +
                        '<div style="font-size:11px; margin-bottom:4px;"><b>Scope Matrix:</b> ' + repo.visibility + '</div>' +
                        '<div style="font-size:11px; margin-bottom:12px;"><b>Target Branch:</b> ' + repo.branch + '</div>' +
                        
                        '<div class="form-label">Search Files</div>' +
                        '<input type="text" id="repoFilesFilterQuery" class="workspace-field" style="margin-bottom: 8px;" placeholder="Search files in repo..." onkeyup="renderRepoBrowser()" />' +
                        
                        '<div id="detailRepoFiles" class="file-scroll-stack" style="max-height:160px; overflow-y:auto; margin-bottom:12px; padding:0; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15);">Loading files...</div>' +
                        
                        '<div class="btn-row">' +
                            '<button id="btnSearchCancel" class="btn btn-secondary" style="font-size:10px; padding:4px;">Cancel</button>' +
                            '<button id="btnSearchClone" class="btn btn-primary" style="font-size:10px; padding:4px;">Clone Target</button>' +
                        '</div>';
                    
                    document.getElementById('btnSearchCancel').onclick = () => {
                        card.style.display = 'none';
                        window.focusedRepoSelected = null;
                        repoBrowserAllFiles = [];
                        repoBrowserCurrentPath = "";
                        saveWebviewState();
                    };
                    document.getElementById('btnSearchClone').onclick = () => {
                        vscode.postMessage({command:'triggerClone', payload: repo.link});
                    };
                    saveWebviewState();
                }

                function renderCurBrowser() {
                    const query = (document.getElementById('curFilesSearch')?.value || '').toLowerCase();
                    const listContainer = document.getElementById('curFilesList');
                    if (!listContainer) return;
                    
                    let files = curBrowserAllFiles || [];
                    
                    if (query) {
                        const filtered = files.filter(f => f.toLowerCase().includes(query));
                        listContainer.innerHTML = filtered.map(f => 
                            '<div class="repo-browser-row" data-is-dir="false" data-path="' + f + '">' +
                                '<span class="repo-icon">📄</span>' +
                                '<span class="repo-name">' + f + '</span>' +
                                '<span class="repo-commit">Local Asset</span>' +
                                '<span class="repo-time">-</span>' +
                            '</div>'
                        ).join('');
                        return;
                    }
                    
                    const items = getDirectoryContents(files, curBrowserCurrentPath);
                    let html = '';
                    if (curBrowserCurrentPath) {
                        html += '<div class="repo-browser-row back-row" data-is-dir="true" data-path="..">' +
                            '<span class="repo-icon">📁</span>' +
                            '<span class="repo-name" style="color: var(--accent);">..</span>' +
                            '<span class="repo-commit">go back</span>' +
                            '<span class="repo-time"></span>' +
                        '</div>';
                    }
                    
                    html += items.map(item => {
                        const icon = item.isDirectory ? '📁' : '📄';
                        return '<div class="repo-browser-row" data-is-dir="' + item.isDirectory + '" data-path="' + item.name + '">' +
                            '<span class="repo-icon">' + icon + '</span>' +
                            '<span class="repo-name ' + (item.isDirectory ? 'dir-link' : '') + '">' + item.name + '</span>' +
                            '<span class="repo-commit">' + (item.isDirectory ? 'Directory' : 'Local Asset') + '</span>' +
                            '<span class="repo-time">-</span>' +
                        '</div>';
                    }).join('');
                    
                    listContainer.innerHTML = html || '<div style="color:var(--text-muted); padding:12px; text-align:center;">Empty directory</div>';
                }

                document.getElementById('curFilesList').onclick = (e) => {
                    const row = e.target.closest('.repo-browser-row');
                    if (!row) return;
                    const path = row.getAttribute('data-path');
                    const isDir = row.getAttribute('data-is-dir') === 'true';
                    if (!isDir) return;
                    
                    if (path === '..') {
                        const parts = curBrowserCurrentPath.split('/');
                        parts.pop();
                        curBrowserCurrentPath = parts.join('/');
                    } else {
                        curBrowserCurrentPath = curBrowserCurrentPath ? curBrowserCurrentPath + '/' + path : path;
                    }
                    renderCurBrowser();
                    saveWebviewState();
                };

                // GitBuddy Push Pipeline control click event listeners
                const runPipelineBtn = document.getElementById('btnRunPipeline');
                if (runPipelineBtn) {
                    runPipelineBtn.onclick = () => {
                        const msgInput = document.getElementById('pipelineCommitMessage');
                        const commitMsg = msgInput ? msgInput.value.trim() : '';
                        vscode.postMessage({ command: 'runOneClickPush', commitMessage: commitMsg });
                    };
                }

                const suggestBtn = document.getElementById('btnSuggestCommitMsg');
                if (suggestBtn) {
                    suggestBtn.onclick = () => {
                        vscode.postMessage({ command: 'requestCommitSuggestion' });
                    };
                }

                const undoBtn = document.getElementById('btnUndoCommit');
                if (undoBtn) {
                    undoBtn.onclick = () => {
                        vscode.postMessage({ command: 'triggerUndoCommit' });
                    };
                }

                const redoBtn = document.getElementById('btnRedoCommit');
                if (redoBtn) {
                    redoBtn.onclick = () => {
                        vscode.postMessage({ command: 'triggerRedoCommit' });
                    };
                }

                // Toast management helper
                function showToast(message, type = 'info', duration = 4000) {
                    const container = document.getElementById('toast-container');
                    if (!container) return;
                    
                    const toast = document.createElement('div');
                    toast.className = 'toast-notification ' + type;
                    
                    let symbol = 'ℹ️';
                    if (type === 'success') symbol = '✅';
                    else if (type === 'error') symbol = '❌';
                    else if (type === 'warning') symbol = '⚠️';
                    
                    toast.innerHTML = '<span>' + symbol + ' ' + message + '</span>' +
                        '<button class="toast-close-btn">&times;</button>';
                    
                    toast.querySelector('.toast-close-btn').onclick = () => {
                        toast.classList.remove('show');
                        setTimeout(() => toast.remove(), 300);
                    };
                    
                    container.appendChild(toast);
                    
                    // Force reflow
                    toast.offsetHeight;
                    toast.classList.add('show');
                    
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.classList.remove('show');
                            setTimeout(() => {
                                if (toast.parentNode) toast.remove();
                            }, 300);
                        }
                    }, duration);
                }

                restoreWebviewState();
                vscode.postMessage({ command: 'webviewReady' });
            </script>
            <!-- Toast Notification Container -->
            <div id="toast-container" style="position: fixed; bottom: 12px; right: 12px; left: 12px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"></div>
        </body>
        </html>`;
    }
}