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
                case 'tabChanged':
                    await this._context.workspaceState.update('activeTab', data.tabId);
                    if (data.tabId === 'current') {
                        await vscode.commands.executeCommand('git-buddy.refreshRepoDiagnostics');
                    }
                    break;
            }
        });
    }

    public sendJsonData(command: string, payload: any) {
        if (this._view) { this._view.webview.postMessage({ command, payload }); }
    }

    private _getHtmlForWebview(webview: vscode.WebviewView['webview']): string {
        const activeTab = this._context.workspaceState.get<string>('activeTab') || 'search';

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                    padding: 10px; font-family: var(--vscode-font-family, sans-serif);
                    background-color: var(--bg-card); color: var(--text-main); margin: 0;
                    box-sizing: border-box; display: flex; flex-direction: column; height: 100vh; overflow: hidden;
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
                .state-waiting { color: #585b70; }
                @keyframes pulseText { from { opacity: 0.5; } to { opacity: 1; } }
            </style>
        </head>
        <body>

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

                    // 🎯 Clean Alignment Guardrail: Search Box Visibility Logic matches requirements
                    const searchBar = document.getElementById('globalSearchBarFrame');
                    if (tabId === 'search') {
                        searchBar.style.display = 'block';
                    } else {
                        searchBar.style.display = 'none';
                    }

                    vscode.postMessage({ command: 'tabChanged', tabId: tabId });
                }

                function dispatchSearchTokenUpdate() {
                    const val = document.getElementById('workspaceFilterQuery').value;
                    vscode.postMessage({ command: 'searchQueryChanged', query: val });
                }

                function triggerCancelWorkflow() {
                    vscode.postMessage({ command: 'triggerCancelDialog' });
                }

                function submitRepositoryCreation() {
                    const name = document.getElementById('newRepoName').value.trim();
                    const branch = document.getElementById('newRepoBranch').value.trim();
                    const readme = document.getElementById('newRepoReadme').checked;
                    if(!name) return;
                    vscode.postMessage({ command: 'triggerCreateRepo', payload: { name, branch, readme } });
                }

                window.addEventListener('message', event => {
                    const msg = event.data;
                    switch(msg.command) {
                        case 'syncDiagnosticsHeader':
                            document.getElementById('headerRepoName').innerText = msg.payload.repoName;
                            document.getElementById('headerUserName').innerText = msg.payload.userName;
                            
                            // 🎯 First Install Guardrail: Force Connect view screen if account lacks verification logs
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
                            } else {
                                unauth.style.display = 'block';
                                auth.style.display = 'none';
                            }
                            break;

                        case 'renderSearchQueryDataset':
                            const outputBox = document.getElementById('searchFrameOutput');
                            outputBox.innerHTML = msg.payload.map(r => \`
                                <div class="search-item-card" onclick="renderTargetSelectionCard(\\\${JSON.stringify(r)})">
                                    <b>\\\${r.name}</b> <span class="meta-badge">\\\${r.visibility}</span>
                                    <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">\\\${r.link}</div>
                                </div>
                            \`).join('');
                            break;

                        case 'syncDiagnosticsTelemetry':
                            document.getElementById('curName').innerText = msg.payload.name;
                            document.getElementById('curBranch').innerText = msg.payload.branch;
                            document.getElementById('curVisibility').innerText = msg.payload.visibility;
                            
                            const fileBox = document.getElementById('curFilesList');
                            fileBox.innerHTML = msg.payload.files.length ? msg.payload.files.map(f => '<div class="file-stack-item">' + f + '</div>').join('') : '<div style="color:var(--text-muted); padding:4px;">No files tracked</div>';
                            
                            document.getElementById('curCommitTitle').innerText = msg.payload.latestCommitMsg || "No commit records";
                            const commBox = document.getElementById('curCommitFiles');
                            commBox.innerHTML = msg.payload.latestCommitFiles.length ? msg.payload.latestCommitFiles.map(f => '<div class="file-stack-item">' + f + '</div>').join('') : '<div style="color:var(--text-muted); padding:4px;">-</div>';
                            
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
                                return \`
                                    <div class="pipe-step-row \\\${styleCls}">
                                        <div class="pipe-dot-icon">\\\${symbol}</div>
                                        <div>
                                            <div style="font-weight:600;">\\\${s.title}</div>
                                            <div style="font-size:9px; color:var(--text-muted);">\\\${s.desc}</div>
                                        </div>
                                    </div>\`;
                            }).join('');
                            break;
                    }
                });

                function renderTargetSelectionCard(repo) {
                    const card = document.getElementById('searchDetailCard');
                    card.style.display = 'block';
                    card.innerHTML = \`
                        <div class="form-label" style="color:var(--accent);">Focused Upstream Repository</div>
                        <div style="font-weight:bold; font-size:13px; margin-bottom:4px;">\${repo.name}</div>
                        <div style="font-size:11px;"><b>Target Branch:</b> \${repo.branch}</div>
                        <div style="font-size:11px; margin-bottom:8px;"><b>Scope Matrix:</b> \${repo.visibility}</div>
                        <div class="btn-row">
                            <button class="btn btn-secondary" style="font-size:10px; padding:4px;" onclick="vscode.postMessage({command:'openExternalUrl', url:'\${repo.link}'})">Open GitHub</button>
                            <button class="btn btn-primary" style="font-size:10px; padding:4px;" onclick="vscode.postMessage({command:'triggerClone', payload:'\${repo.link}'})">Clone Target</button>
                        </div>\`;
                }
            </script>
        </body>
        </html>`;
    }
}