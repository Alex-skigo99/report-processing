const metricUtils = require("./metricUtils");

/**
 * Generate complete HTML for report
 * @param {Object} reportData - Report data including metrics and metadata
 * @returns {string} HTML string
 */
function generateReportHTML(reportData) {
    const { title, startDate, endDate, metrics, organizationName } = reportData;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        ${getStyles()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
    <div class="report-container">
        ${generateReportHeader(title, startDate, endDate, organizationName)}
        ${generateTableOfContents(metrics)}
        ${generateMetricsSections(metrics)}
        ${generateFooter()}
    </div>
</body>
</html>
    `.trim();
}

/**
 * Get CSS styles for the report
 */
function getStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #2563eb;
        }
        
        .report-title {
            font-size: 32px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .report-date-range {
            font-size: 14px;
            color: #9ca3af;
            font-weight: 500;
        }
        
        .table-of-contents {
            background: #f9fafb;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 40px;
            page-break-after: always;
        }
        
        .toc-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .toc-list {
            list-style: none;
        }
        
        .toc-item {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .toc-item:last-child {
            border-bottom: none;
        }
        
        .toc-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }
        
        .metric-section {
            margin-bottom: 50px;
            page-break-inside: avoid;
        }
        
        .sub-account-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #93c5fd;
        }
        
        .sub-account-title {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
            padding: 10px;
            background: #eff6ff;
            border-left: 4px solid #2563eb;
        }
        
        .summary-box {
            background: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        
        .summary-text {
            font-size: 14px;
            color: #92400e;
            font-weight: 500;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        thead {
            background: #1e40af;
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        tbody tr:hover {
            background: #f9fafb;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
            font-style: italic;
        }
        
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        
        .chart-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
            text-align: center;
        }
        
        canvas {
            max-width: 100%;
            height: 300px !important;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
        }
        
        .error-message {
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #dc2626;
            margin-bottom: 15px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-completed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-working {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-waiting {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-not-started {
            background: #f3f4f6;
            color: #4b5563;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .no-page-break {
                page-break-inside: avoid;
            }
        }
    `;
}

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
 * Generate table of contents
 */
function generateTableOfContents(metrics) {
    const items = metrics.map((metric, index) => {
        const metricName = getMetricDisplayName(metric.type);
        return `
            <li class="toc-item">
                <a href="#metric-${index}" class="toc-link">${index + 1}. ${escapeHtml(metricName)}</a>
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

/**
 * Generate all metric sections
 */
function generateMetricsSections(metrics) {
    return metrics.map((metric, index) => {
        return generateMetricSection(metric, index);
    }).join('\n');
}

/**
 * Generate a single metric section
 */
function generateMetricSection(metric, index) {
    const metricName = getMetricDisplayName(metric.type);
    
    if (metric.error) {
        return `
            <div class="metric-section page-break" id="metric-${index}">
                <h2 class="section-title">${escapeHtml(metricName)}</h2>
                <div class="error-message">
                    Error: ${escapeHtml(metric.error)}
                </div>
            </div>
        `;
    }

    // Group data by sub-account
    const subAccountGroups = groupBySubAccount(metric.data);
    
    return `
        <div class="metric-section page-break" id="metric-${index}">
            <h2 class="section-title">${escapeHtml(metricName)}</h2>
            ${generateSubAccountSections(subAccountGroups, metric.type)}
        </div>
    `;
}

/**
 * Group metric data by sub-account
 */
function groupBySubAccount(data) {
    if (!Array.isArray(data)) {
        return [data];
    }
    return data;
}

/**
 * Generate sub-account sections
 */
function generateSubAccountSections(subAccountData, metricType) {
    if (!Array.isArray(subAccountData)) {
        subAccountData = [subAccountData];
    }

    return subAccountData.map(subAccount => {
        return `
            <div class="sub-account-section">
                <h3 class="sub-account-title">${escapeHtml(subAccount.subAccountName || 'Unknown Sub-Account')}</h3>
                ${generateMetricContent(subAccount, metricType)}
            </div>
        `;
    }).join('');
}

/**
 * Generate metric-specific content
 */
function generateMetricContent(data, metricType) {
    if (metricType === metricUtils.METRICS.GMB_REINSTATEMENT) {
        return generateReinstatementTable(data);
    } else if (metricType === metricUtils.METRICS.GMB_VERIFICATION) {
        return generateVerificationTable(data);
    } else if (isGooglePerformanceMetric(metricType)) {
        return generatePerformanceSection(data);
    }
    
    return '<p class="no-data">No data available for this metric type.</p>';
}

/**
 * Generate reinstatement table
 */
function generateReinstatementTable(data) {
    if (!data.submissions || data.submissions.length === 0) {
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
 * Generate verification table
 */
function generateVerificationTable(data) {
    if (!data.submissions || data.submissions.length === 0) {
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
 * Generate performance section with charts and tables
 */
function generatePerformanceSection(data) {
    if (!data.locations || data.locations.length === 0) {
        return '<p class="no-data">No locations found for this metric.</p>';
    }

    const totalValue = data.locations.reduce((sum, loc) => sum + (loc.total || 0), 0);
    
    // Generate location summary table
    const locationRows = data.locations.map(location => {
        if (location.error) {
            return `
                <tr>
                    <td>${escapeHtml(location.businessName || 'N/A')}</td>
                    <td>${escapeHtml(location.locality || 'N/A')}</td>
                    <td>${escapeHtml(location.address || 'N/A')}</td>
                    <td colspan="2"><span class="error-message" style="display: inline-block; padding: 4px 8px;">${escapeHtml(location.error)}</span></td>
                </tr>
            `;
        }
        
        return `
            <tr>
                <td>${escapeHtml(location.businessName || 'N/A')}</td>
                <td>${escapeHtml(location.locality || 'N/A')}</td>
                <td>${escapeHtml(location.address || 'N/A')}</td>
                <td style="text-align: right; font-weight: 600;">${formatNumber(location.total || 0)}</td>
            </tr>
        `;
    }).join('');

    // Generate chart for time series data
    const chartHtml = generatePerformanceChart(data);

    return `
        <div class="summary-box">
            <p class="summary-text">Total ${escapeHtml(data.metricName || 'Metric')}: ${formatNumber(totalValue)}</p>
        </div>
        ${chartHtml}
        <table>
            <thead>
                <tr>
                    <th>Business Name</th>
                    <th>Locality</th>
                    <th>Address</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${locationRows}
            </tbody>
        </table>
    `;
}

/**
 * Generate chart for performance metrics
 */
function generatePerformanceChart(data) {
    // Aggregate time series data across all locations
    const aggregatedData = {};
    
    data.locations.forEach(location => {
        if (!location.timeSeries || !Array.isArray(location.timeSeries)) {
            return;
        }
        
        location.timeSeries.forEach(dataPoint => {
            const dateKey = `${dataPoint.date.year}-${String(dataPoint.date.month).padStart(2, '0')}-${String(dataPoint.date.day).padStart(2, '0')}`;
            const value = parseInt(dataPoint.value, 10) || 0;
            
            if (!aggregatedData[dateKey]) {
                aggregatedData[dateKey] = 0;
            }
            aggregatedData[dateKey] += value;
        });
    });

    // Sort by date
    const sortedDates = Object.keys(aggregatedData).sort();
    const labels = sortedDates.map(date => formatChartDate(date));
    const values = sortedDates.map(date => aggregatedData[date]);

    const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
        <div class="chart-container">
            <h4 class="chart-title">${escapeHtml(data.metricName || 'Performance')} Over Time</h4>
            <canvas id="${chartId}"></canvas>
        </div>
        <script>
            (function() {
                const ctx = document.getElementById('${chartId}');
                if (ctx) {
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ${JSON.stringify(labels)},
                            datasets: [{
                                label: '${escapeHtml(data.metricName || 'Metric')}',
                                data: ${JSON.stringify(values)},
                                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                                borderColor: 'rgba(37, 99, 235, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                }
            })();
        </script>
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

/**
 * Helper functions
 */

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatChartDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completed') || statusLower.includes('paid')) {
        return 'status-completed';
    }
    if (statusLower.includes('working')) {
        return 'status-working';
    }
    if (statusLower.includes('waiting')) {
        return 'status-waiting';
    }
    
    return 'status-not-started';
}

function getMetricDisplayName(metricType) {
    const displayNames = {
        [metricUtils.METRICS.GMB_REINSTATEMENT]: 'GMB Reinstatement Submissions',
        [metricUtils.METRICS.GMB_VERIFICATION]: 'GMB Verification Submissions',
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS': 'Desktop Maps Impressions',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH': 'Desktop Search Impressions',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS': 'Mobile Maps Impressions',
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH': 'Mobile Search Impressions',
        'CALL_CLICKS': 'Call Clicks',
        'WEBSITE_CLICKS': 'Website Clicks',
        'BUSINESS_DIRECTION_REQUESTS': 'Direction Requests',
        'BUSINESS_CONVERSATIONS': 'Conversations',
        'BUSINESS_BOOKINGS': 'Bookings',
        'BUSINESS_FOOD_ORDERS': 'Food Orders',
        'BUSINESS_FOOD_MENU_CLICKS': 'Menu Clicks',
    };
    
    return displayNames[metricType] || metricType;
}

function isGooglePerformanceMetric(metricType) {
    const performanceMetrics = [
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        'CALL_CLICKS',
        'WEBSITE_CLICKS',
        'BUSINESS_DIRECTION_REQUESTS',
        'BUSINESS_CONVERSATIONS',
        'BUSINESS_BOOKINGS',
        'BUSINESS_FOOD_ORDERS',
        'BUSINESS_FOOD_MENU_CLICKS',
    ];
    
    return performanceMetrics.includes(metricType);
}

module.exports = {
    generateReportHTML,
};
