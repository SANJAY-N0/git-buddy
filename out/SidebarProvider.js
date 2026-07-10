"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = void 0;
const vscode = require("vscode");
class SidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
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
            }
        });
    }
    updateStep(stepIndex, state, detailText) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateStepState',
                stepIndex,
                state,
                detailText
            });
        }
    }
    resetPipeline() {
        if (this._view) {
            this._view.webview.postMessage({ command: 'resetPipelineAll' });
        }
    }
    _getHtmlForWebview(webview) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                :root {
                    --accent-color: #5046e5;
                    --accent-light: rgba(80, 70, 229, 0.15);
                    --line-faded: #374151;
                    --text-main: #f3f4f6;
                    --text-muted: #9ca3af;
                    --text-pending: #4b5563;
                }
                body {
                    padding: 12px;
                    font-family: var(--vscode-font-family, sans-serif);
                    background-color: var(--vscode-sideBar-background);
                    color: var(--text-main);
                }
                .auth-container {
                    margin-bottom: 16px;
                }
                .btn-github {
                    background-color: #24292e;
                    color: #ffffff;
                    border: 1px solid #444c56;
                    padding: 10px 14px;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                    font-weight: 600;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background-color 0.2s ease;
                }
                .btn-github:hover {
                    background-color: #2f363d;
                }
                .stepper-card {
                    background: var(--vscode-editor-background);
                    border-radius: 12px;
                    padding: 16px 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border: 1px solid var(--vscode-panel-border);
                }
                .step-item {
                    display: flex;
                    position: relative;
                    padding: 12px 6px;
                    border-radius: 8px;
                    transition: background 0.2s ease;
                }
                .active-card {
                    background: var(--accent-light);
                }
                .step-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-right: 14px;
                    position: relative;
                    width: 20px;
                }
                .step-indicator .line {
                    position: absolute;
                    top: 20px;
                    bottom: -16px;
                    width: 2px;
                    background: var(--line-faded);
                    z-index: 1;
                }
                .step-indicator .circle {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    background: var(--vscode-editor-background);
                    border: 2px solid transparent;
                }
                .circle .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .step-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .step-title {
                    font-weight: 600;
                    font-size: 13px;
                }
                .step-desc {
                    font-size: 11px;
                    color: var(--text-muted);
                    margin-top: 2px;
                    line-height: 1.3;
                }
                .step-item.completed .step-indicator .line { background: var(--accent-color); }
                .step-item.completed .circle { background: var(--accent-color); border-color: var(--accent-color); }
                .step-item.completed .dot { background: #ffffff; }
                .step-item.completed .step-title { color: var(--text-main); }
                .step-item.active .circle { border-color: var(--accent-color); box-shadow: 0 0 0 4px var(--accent-light); }
                .step-item.active .dot { background: var(--accent-color); }
                .step-item.active .step-title { color: var(--accent-color); }
                .step-item.pending .circle { border-color: var(--line-faded); }
                .step-item.pending .dot { background: var(--line-faded); }
                .step-item.pending .step-title { color: var(--text-pending); }
                .step-item.pending .step-desc { color: var(--text-pending); }
            </style>
        </head>
        <body>
            <div class="auth-container">
                <button class="btn-github" id="connectGitHubBtn">
                    🔗 Connect GitHub Account
                </button>
            </div>

            <div class="stepper-card">
                <div class="step-item pending">
                    <div class="step-indicator"><div class="line"></div><div class="circle"><div class="dot"></div></div></div>
                    <div class="step-content">
                        <span class="step-title">Create Workspace Asset</span>
                        <span class="step-desc" id="desc-0">echo "# git-sample" &gt;&gt; README.md</span>
                    </div>
                </div>
                <div class="step-item pending">
                    <div class="step-indicator"><div class="line"></div><div class="circle"><div class="dot"></div></div></div>
                    <div class="step-content">
                        <span class="step-title">Initialize Repository</span>
                        <span class="step-desc" id="desc-1">git init</span>
                    </div>
                </div>
                <div class="step-item pending">
                    <div class="step-indicator"><div class="line"></div><div class="circle"><div class="dot"></div></div></div>
                    <div class="step-content">
                        <span class="step-title">Stage Configurations</span>
                        <span class="step-desc" id="desc-2">git add README.md</span>
                    </div>
                </div>
                <div class="step-item pending">
                    <div class="step-indicator"><div class="line"></div><div class="circle"><div class="dot"></div></div></div>
                    <div class="step-content">
                        <span class="step-title">Commit & Branch Reference</span>
                        <span class="step-desc" id="desc-3">git commit &amp; git branch -M main</span>
                    </div>
                </div>
                <div class="step-item pending">
                    <div class="step-indicator"><div class="circle"><div class="dot"></div></div></div>
                    <div class="step-content">
                        <span class="step-title">GitHub Stream Transport</span>
                        <span class="step-desc" id="desc-4">git push -u origin main</span>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('connectGitHubBtn').addEventListener('click', () => {
                    vscode.postMessage({ command: 'runConnectAuth' });
                });

                window.addEventListener('message', event => {
                    const msg = event.data;
                    const steps = document.querySelectorAll('.step-item');
                    
                    if (msg.command === 'updateStepState') {
                        const target = steps[msg.stepIndex];
                        if (target) {
                            target.classList.remove('completed', 'active', 'pending', 'active-card');
                            target.classList.add(msg.state);
                            if (msg.state === 'active') {
                                target.classList.add('active-card');
                            }
                            if (msg.detailText) {
                                document.getElementById('desc-' + msg.stepIndex).innerText = msg.detailText;
                            }
                        }
                    } else if (msg.command === 'resetPipelineAll') {
                        steps.forEach((step, idx) => {
                            step.classList.remove('completed', 'active', 'active-card');
                            step.classList.add('pending');
                        });
                        document.getElementById('desc-0').innerText = 'echo "# git-sample" >> README.md';
                        document.getElementById('desc-1').innerText = 'git init';
                        document.getElementById('desc-2').innerText = 'git add README.md';
                        document.getElementById('desc-3').innerText = 'git commit & git branch -M main';
                        document.getElementById('desc-4').innerText = 'git push -u origin main';
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=SidebarProvider.js.map