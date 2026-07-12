export function getNewView(): string {
    return `
    <div id="panel-new" class="tab-panel">
        <div class="form-group">
            <div class="form-label">Create a New Repository Name</div>
            <input type="text" id="newRepoName" class="workspace-field" placeholder="Enter repository name..." />
        </div>
        <div class="form-group">
            <div class="form-label">Select Branch Target</div>
            <input type="text" id="newRepoBranch" class="workspace-field" value="main" />
        </div>
        <div class="toggle-row">
            <span class="form-label" style="margin:0;">Include README.md Toggle</span>
            <label class="switch">
                <input type="checkbox" id="newRepoReadme" checked />
                <span class="slider"></span>
            </label>
        </div>
        <div class="btn-row">
            <button class="btn btn-secondary" onclick="triggerCancelWorkflow()">Cancel</button>
            <button class="btn btn-primary" onclick="submitRepositoryCreation()">Create</button>
        </div>
    </div>`;
}