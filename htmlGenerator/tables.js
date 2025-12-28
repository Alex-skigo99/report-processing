const { escapeHtml, formatDate, getStatusClass, formatNumber } = require('./helpers');

/**
 * Generate GMB Reinstatement table
 */
function generateReinstatementTable(data) {
    if (!data || !data.submissions || data.submissions.length === 0) {
        return '<p class="no-data">No reinstatement submissions found for this period.</p>';
    }

    const rows = data.submissions.map(submission => `
        <tr>
            <td>${escapeHtml(submission.google_listing_name || 'N/A')}</td>
            <td>${formatDate(submission.updated_at)}</td>
            <td><span class="status-badge ${getStatusClass(submission.status)}">${escapeHtml(submission.status || 'N/A')}</span></td>
            <td><span class="status-badge ${getStatusClass(submission.invoice_status)}">${escapeHtml(submission.invoice_status || 'N/A')}</span></td>
        </tr>
    `).join('');

    return `
        <div class="summary-box">
            <p class="summary-text">Total Reinstatement Submissions: ${data.totalCount}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Google Listing Name</th>
                    <th>Updated Date</th>
                    <th>Status</th>
                    <th>Invoice Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Generate GMB Verification table
 */
function generateVerificationTable(data) {
    if (!data || !data.submissions || data.submissions.length === 0) {
        return '<p class="no-data">No verification submissions found for this period.</p>';
    }

    const rows = data.submissions.map(submission => `
        <tr>
            <td>${escapeHtml(submission.business_name || 'N/A')}</td>
            <td>${formatDate(submission.updated_at)}</td>
            <td><span class="status-badge ${getStatusClass(submission.status)}">${escapeHtml(submission.status || 'N/A')}</span></td>
            <td><span class="status-badge ${getStatusClass(submission.invoice_status)}">${escapeHtml(submission.invoice_status || 'N/A')}</span></td>
        </tr>
    `).join('');

    return `
        <div class="summary-box">
            <p class="summary-text">Total Verification Submissions: ${data.totalCount}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Business Name</th>
                    <th>Updated Date</th>
                    <th>Status</th>
                    <th>Invoice Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Generate Review Removal table
 */
function generateReviewRemovalTable(data) {
    if (!data || !data.submissions || data.submissions.length === 0) {
        return '<p class="no-data">No review removal submissions found for this period.</p>';
    }

    const rows = data.submissions.map(submission => {
        const reviewText = submission.review_link ? String(submission.review_link).substring(0, 30) : 'N/A';
        return `
        <tr>
            <td>${escapeHtml(submission.business_name || 'N/A')}</td>
            <td>${escapeHtml(reviewText)}</td>
            <td>${formatDate(submission.updated_at)}</td>
            <td><span class="status-badge ${getStatusClass(submission.status)}">${escapeHtml(submission.status || 'N/A')}</span></td>
            <td><span class="status-badge ${getStatusClass(submission.invoice_status)}">${escapeHtml(submission.invoice_status || 'N/A')}</span></td>
        </tr>
    `;
    }).join('');

    return `
        <div class="summary-box">
            <p class="summary-text">Total Review Removal Submissions: ${data.totalCount}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Business Name</th>
                    <th>Review Text</th>
                    <th>Updated Date</th>
                    <th>Status</th>
                    <th>Invoice Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Generate location summary table for performance metrics
 * Handles both single metric (array of locations) and all metrics (array of metric data objects)
 */
function generateLocationSummaryTable(data, metricName) {
    if (!data || data.length === 0) {
        return '<p class="no-data">No data found.</p>';
    }

    // Determine if this is the new combined metrics format or the old single-metric format
    const isCombinedMetrics = data.some(item => item.metricName && item.metricType);

    const rows = data.map(item => {
        const businessName = escapeHtml(item.businessName || 'N/A');
        const locality = escapeHtml(item.locality || 'N/A');
        const address = escapeHtml(item.address || 'N/A');
        
        if (item.error) {
            return `
                <tr>
                    <td>${businessName}</td>
                    <td>${locality}</td>
                    <td>${address}</td>
                    ${isCombinedMetrics ? `<td>${escapeHtml(item.metricName || 'N/A')}</td>` : ''}
                    <td><span class="error-message" style="display: inline-block; padding: 4px 8px;">${escapeHtml(item.error)}</span></td>
                </tr>
            `;
        }
        
        return `
            <tr>
                <td>${businessName}</td>
                <td>${locality}</td>
                <td>${address}</td>
                ${isCombinedMetrics ? `<td>${escapeHtml(item.metricName || 'N/A')}</td>` : ''}
                <td style="text-align: right; font-weight: 600;">${formatNumber(item.total || 0)}</td>
            </tr>
        `;
    }).join('');

    const totalValue = data.reduce((sum, item) => sum + (item.total || 0), 0);

    const tableHeader = isCombinedMetrics ?
        `<tr>
            <th>Business Name</th>
            <th>Locality</th>
            <th>Address</th>
            <th>Metric</th>
            <th style="text-align: right;">Total</th>
        </tr>` :
        `<tr>
            <th>Business Name</th>
            <th>Locality</th>
            <th>Address</th>
            <th style="text-align: right;">Total</th>
        </tr>`;

    return `
        <div class="summary-box">
            <p class="summary-text">Total ${escapeHtml(metricName)}: ${formatNumber(totalValue)}</p>
        </div>
        <table>
            <thead>
                ${tableHeader}
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

module.exports = {
    generateReinstatementTable,
    generateVerificationTable,
    generateReviewRemovalTable,
    generateLocationSummaryTable,
};
