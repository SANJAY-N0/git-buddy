export function getCurrentView(): string {
    return `
    <div id="panel-current" class="tab-panel">
        <div class="current-repo-grid">
            <div class="meta-row"><span>Repository Name:</span><b id="curName">-</b></div>
            <div class="meta-row"><span>Branch Track:</span><b id="curBranch">-</b></div>
            <div class="meta-row"><span>Visibility Scope:</span><b id="curVisibility">-</b></div>
        </div>

        <button class="btn btn-primary" style="margin-bottom: 12px; width: 100%;" id="btnOpenGitHubExternal">🌐 Open GitHub Repository</button>

        <!-- GitBuddy Auto-Push Dashboard Container -->
        <div style="margin-top: 12px; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: rgba(255,255,255,0.02); margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span class="form-label" style="margin: 0; color: var(--accent);">GitBuddy Auto-Push</span>
                <button class="btn" id="btnSuggestCommitMsg" style="font-size: 9px; padding: 1px 6px; background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent); border-radius: 4px;">✨ Suggest Message</button>
            </div>
            <input type="text" id="pipelineCommitMessage" class="workspace-field" style="margin-bottom: 8px;" value="Incremental synchronization sync" placeholder="Enter commit description..." />
            <button class="btn btn-primary" id="btnRunPipeline" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px;">
                🚀 One-Click Push Pipeline
            </button>
        </div>

        <div class="form-label">Workspace Asset File Index</div>
        <input type="text" id="curFilesSearch" class="workspace-field" style="margin-bottom: 8px;" placeholder="Search files..." onkeyup="renderCurBrowser()" />
        <div id="curFilesList" class="file-scroll-stack" style="max-height: 140px; overflow-y: auto; margin-bottom: 12px; padding: 0; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15);"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; margin-bottom: 4px;">
            <div class="form-label" style="margin: 0;">Recent Commit Modifications</div>
            <div style="display: flex; gap: 4px;">
                <button class="btn" id="btnUndoCommit" title="Undo last commit (Soft Reset)" style="font-size: 9px; padding: 1px 6px; background: #2e303f; border: 1px solid var(--border-color); color: var(--text-main); display: flex; align-items: center; gap: 2px;">
                    ↩️ Undo
                </button>
                <button class="btn" id="btnRedoCommit" title="Redo last undone commit" style="font-size: 9px; padding: 1px 6px; background: #2e303f; border: 1px solid var(--border-color); color: var(--text-main); display: none; align-items: center; gap: 2px;">
                    🔁 Redo
                </button>
            </div>
        </div>
        <div id="curCommitTitle" style="font-size: 11px; font-weight: bold; color: var(--green-success); margin-bottom: 4px;">-</div>
        <div id="curCommitFiles" class="file-scroll-stack" style="margin-bottom: 12px;"></div>

        <div class="form-label">Working Tree / Changed Files</div>
        <div id="curChangedFiles" class="file-scroll-stack"></div>
    </div>`;
}