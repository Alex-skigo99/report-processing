const { escapeHtml } = require('./helpers');

/**
 * Generate table of contents
 */
function generateTableOfContents(subAccounts) {
    const items = subAccounts.map((subAccount, index) => {
        return `
            <li class="toc-item">
                <a href="#sub-account-${index}" class="toc-link">${index + 1}. ${escapeHtml(subAccount.name)}</a>
            </li>
        `;
    }).join('');

    return `
        <div class="table-of-contents">
            <h2 class="toc-title">Table of Contents</h2>
            <ul class="toc-list">
                ${items}
            </ul>
        </div>
    `;
}

module.exports = { generateTableOfContents };
