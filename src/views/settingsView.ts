export function getSettingsView(): string {
    return `
    <div id="panel-setting" class="tab-panel">
        <div id="unauthenticatedView" style="text-align:center; padding: 20px 10px;">
            <div class="form-label" style="margin-bottom:12px;">Account Connection Required</div>
            <button class="btn btn-primary" onclick="vscode.postMessage({command:'runConnectAuth'})">🔗 Connect GitHub Account</button>
        </div>
        
        <div id="authenticatedView" style="display:none; text-align:left;">
            <!-- Profile header with avatar on left and username on right -->
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                <img id="githubAvatar" src="" class="profile-avatar" style="width:40px; height:40px; border-radius:50%; margin:0; border: 2px solid var(--accent);" alt="profile"/>
                <div style="flex: 1; overflow: hidden;">
                    <div id="githubUserHandle" style="font-size:14px; font-weight:bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
                    <div id="githubRepoCount" style="font-size:10px; color:var(--text-muted);">Active Repositories: --</div>
                </div>
            </div>
            
            <!-- GitHub Style Green New Repo Button -->
            <button class="btn" style="background-color: #2da44e; color: white; margin-bottom: 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 600; border: 1px solid rgba(27,31,36,0.15); border-radius: 6px; padding: 6px 12px;" onclick="switchFrameView('new')">
                <svg aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" fill="currentColor" style="display: inline-block; vertical-align: text-top;"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path></svg>
                New
            </button>

            <!-- Repository Search/Filter Section -->
            <input type="text" id="settingsRepoQuery" class="workspace-field" style="margin-bottom: 8px;" placeholder="Find a repository..." onkeyup="filterSettingsRepos()" />
            
            <div style="display: flex; gap: 4px; margin-bottom: 12px;">
                <select class="workspace-field" style="font-size: 10px; padding: 4px; flex: 1;" onchange="filterSettingsRepos()">
                    <option value="all">Type: All</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                </select>
                <select class="workspace-field" style="font-size: 10px; padding: 4px; flex: 1;" onchange="filterSettingsRepos()">
                    <option value="all">Lang: All</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                </select>
                <select class="workspace-field" style="font-size: 10px; padding: 4px; flex: 1;" onchange="filterSettingsRepos()">
                    <option value="updated">Sort: Updated</option>
                    <option value="name">Name</option>
                </select>
            </div>

            <div class="form-label" style="margin-top: 10px; margin-bottom: 6px;">Your GitHub Repositories</div>
            <div id="settingsRepoList" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 0; background: rgba(0,0,0,0.15); margin-bottom: 12px;"></div>

            <div class="btn-row" style="margin-top: 12px; margin-bottom: 16px; display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="vscode.postMessage({command:'runConnectAuth'})" style="font-size: 10px; padding: 6px; flex: 1;">🔄 Switch</button>
                <button class="btn btn-secondary" onclick="vscode.postMessage({command:'logoutGitHub'})" style="font-size: 10px; padding: 6px; flex: 1; background: #e06c75; color: white;">🚪 Logout</button>
            </div>
        </div>

        <!-- Theme Settings Section (Always visible) -->
        <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <div class="form-label">Theme Mode Settings</div>
            <select id="themeSelector" class="workspace-field" onchange="changeTheme(this.value)">
                <option value="system">System Default</option>
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
            </select>
        </div>
    </div>`;
}