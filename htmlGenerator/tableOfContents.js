const { escapeHtml } = require('./helpers');

function generateTableOfContents(subAccounts) {
    const items = subAccounts.map((subAccount, index) => {
        // Extract unique location names from performance metrics
        const locations = new Set();
        if (subAccount.metrics && subAccount.metrics.performanceMetrics) {
            subAccount.metrics.performanceMetrics.forEach(metric => {
                if (metric.locations && Array.isArray(metric.locations)) {
                    metric.locations.forEach(location => {
                        if (location.businessName) {
                            locations.add(location.businessName);
                        }
                    });
                }
            });
        }

        // Create sub-list for locations
        const locationsList = locations.size > 0 
            ? `
                <ul class="toc-sublist">
                    ${Array.from(locations).map(locationName => 
                        `<li class="toc-item toc-subitem"><span class="toc-location">${escapeHtml(locationName)}</span></li>`
                    ).join('')}
                </ul>
            ` 
            : '';

        return `
            <li class="toc-item">
                <a href="#sub-account-${index}" class="toc-link">${index + 1}. ${escapeHtml(subAccount.name)}</a>
                ${locationsList}
            </li>
        `;
    }).join('');

    return `
        <div class="table-of-contents">
            <h2 class="toc-title">Table of Contents - Sub Accounts</h2>
            <ul class="toc-list">
                ${items}
            </ul>
        </div>
    `;
}

module.exports = { generateTableOfContents };
