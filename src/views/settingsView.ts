export function getSettingsView(): string {
    return `
    <div id="panel-setting" class="tab-panel">
        <div id="unauthenticatedView" style="text-align:center; padding: 20px 10px;">
            <div class="form-label" style="margin-bottom:12px;">Account Connection Required</div>
            <button class="btn btn-primary" onclick="vscode.postMessage({command:'runConnectAuth'})">🔗 Connect GitHub Account</button>
        </div>
        
        <div id="authenticatedView" style="display:none; text-align:center;">
            <img id="githubAvatar" src="" class="profile-avatar" alt="profile"/>
            <div id="githubUserHandle" style="font-size:14px; font-weight:bold; margin-bottom:4px;">-</div>
            <div id="githubRepoCount" style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Active Repositories: --</div>
            <button class="btn btn-secondary" onclick="vscode.postMessage({command:'runConnectAuth'})">🔄 Switch Account</button>
        </div>
    </div>`;
}