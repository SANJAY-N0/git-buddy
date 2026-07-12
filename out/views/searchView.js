"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchView = void 0;
function getSearchView() {
    return `
    <div id="panel-search" class="tab-panel active">
        <!-- Main Component Frame Box -->
        <div id="searchFrameOutput" class="search-frame-container"></div>
        
        <!-- Dropdown Metadata Details Panel Frame -->
        <div id="searchDetailCard" class="detail-card-overlay" style="display:none;"></div>
    </div>`;
}
exports.getSearchView = getSearchView;
//# sourceMappingURL=searchView.js.map