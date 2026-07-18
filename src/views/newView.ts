export function getNewView(): string {
    return `
    <div id="panel-new" class="tab-panel">
        <div class="form-group">
            <div class="form-label">Create a New Repository Name</div>
            <input type="text" id="newRepoName" class="workspace-field" placeholder="Enter repository name..." onkeyup="validateNewRepoName()" />
            <div id="newRepoWarning" style="color:#e06c75; font-size:10px; margin-top:4px; display:none;">⚠️ A repository with this name already exists on your GitHub account.</div>
        </div>
        <div class="form-group">
            <div class="form-label">Select Branch Target</div>
            <input type="text" id="newRepoBranch" class="workspace-field" value="main" onkeyup="saveWebviewState()" />
        </div>
        <div class="form-group">
            <div class="form-label">Select Repository Visibility</div>
            <select id="newRepoVisibility" class="workspace-field" onchange="saveWebviewState()" style="appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a6adc8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 8px top 50%; background-size: 10px auto; padding-right: 24px;">
                <option value="Public">Public</option>
                <option value="Private">Private</option>
            </select>
        </div>
        <div class="toggle-row">
            <span class="form-label" style="margin:0;">Include README.md Toggle</span>
            <label class="switch">
                <input type="checkbox" id="newRepoReadme" checked onchange="saveWebviewState()" />
                <span class="slider"></span>
            </label>
        </div>
        <div class="btn-row">
            <button class="btn btn-secondary" onclick="triggerCancelWorkflow()">Cancel</button>
            <button class="btn btn-primary" onclick="submitRepositoryCreation()">Create</button>
        </div>
    </div>`;
}