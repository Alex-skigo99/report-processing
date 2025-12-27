const { escapeHtml, formatDate } = require('./helpers');

/**
 * Generate report header
 */
function generateReportHeader(title, startDate, endDate, organizationName) {
    return `
        <div class="report-header">
            <h1 class="report-title">${escapeHtml(title)}</h1>
            ${organizationName ? `<p class="report-subtitle">${escapeHtml(organizationName)}</p>` : ''}
            <p class="report-date-range">
                Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}
            </p>
            <p class="report-date-range">
                Generated: ${formatDate(new Date())}
            </p>
        </div>
    `;
}

/**
 * Generate footer
 */
function generateFooter() {
    return `
        <div class="footer">
            <p>This report was automatically generated on ${formatDate(new Date())}.</p>
            <p>© ${new Date().getFullYear()} RenewLocal. All rights reserved.</p>
        </div>
    `;
}

module.exports = {
    generateReportHeader,
    generateFooter,
};
