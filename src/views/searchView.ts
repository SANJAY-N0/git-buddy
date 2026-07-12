export function getSearchView(): string {
    return `
    <div id="panel-search" class="tab-panel active">
        <!-- Main Component Frame Box -->
        <div id="searchFrameOutput" class="search-frame-container"></div>
        
        <!-- Dropdown Metadata Details Panel Frame -->
        <div id="searchDetailCard" class="detail-card-overlay" style="display:none;"></div>
    </div>`;
}