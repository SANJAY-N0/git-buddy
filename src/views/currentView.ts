export function getCurrentView(): string {
    return `
    <div id="panel-current" class="tab-panel">
        <div class="current-repo-grid">
            <div class="meta-row"><span>Repository Name:</span><b id="curName">-</b></div>
            <div class="meta-row"><span>Branch Track:</span><b id="curBranch">-</b></div>
            <div class="meta-row"><span>Visibility Scope:</span><b id="curVisibility">-</b></div>
        </div>

        <button class="btn btn-primary" style="margin-bottom: 12px;" id="btnOpenGitHubExternal">🌐 Open GitHub Repository</button>

        <div class="form-label">Workspace Asset File Index</div>
        <div id="curFilesList" class="file-scroll-stack" style="margin-bottom: 8px;"></div>
        <input type="text" id="curFilesSearch" class="workspace-field" style="margin-bottom: 12px;" placeholder="Search files..." onkeyup="filterCurFiles()" />

        <div class="form-label">Recent Commit Modifications</div>
        <div id="curCommitTitle" style="font-size: 11px; font-weight: bold; color: var(--green-success); margin-bottom: 4px;">-</div>
        <div id="curCommitFiles" class="file-scroll-stack"></div>
    </div>`;
}