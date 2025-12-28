const { getStyles } = require('./styles');
const { generateReportHeader, generateFooter } = require('./header');
const { generateTableOfContents } = require('./tableOfContents');
const {
    generateReinstatementTable,
    generateVerificationTable,
    generateReviewRemovalTable,
    generateLocationSummaryTable,
} = require('./tables');
const { generateLocationChart } = require('./charts');
const { escapeHtml } = require('./helpers');
const { METRICS, getMetricDisplayName } = require('../metricConstants');

/**
 * Main generator function - creates HTML report grouped by sub-account
 * 
 * Data structure expected:
 * {
 *   title: string,
 *   startDate: string,
 *   endDate: string,
 *   organizationName: string,
 *   subAccounts: [
 *     {
 *       id: number,
 *       name: string,
 *       metrics: {
 *         gmb_reinstatement: {...},
 *         gmb_verification: {...},
 *         review_removal: {...},
 *         performanceMetrics: [
 *           {
 *             type: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
 *             locations: [...]
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 */
function generateReportHTML(reportData) {
    const { title, startDate, endDate, organizationName, subAccounts } = reportData;

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
        ${generateTableOfContents(subAccounts)}
        ${generateSubAccountChapters(subAccounts)}
        ${generateFooter()}
    </div>
</body>
</html>
    `.trim();
}

/**
 * Generate all sub-account chapters
 */
function generateSubAccountChapters(subAccounts) {
    // Loop through each sub-account chapter
    return subAccounts.map((subAccount, index) => {
        return generateSubAccountChapter(subAccount, index);
    }).join('\n');
}

/**
 * Generate a single sub-account chapter
 * Each chapter starts on a new page
 */
function generateSubAccountChapter(subAccount, index) {
    const { name, metrics } = subAccount;

    return `
        <div class="sub-account-chapter" id="sub-account-${index}">
            <h2 class="chapter-title">${escapeHtml(name)}</h2>
            
            ${generateMetricTables(metrics)}
            ${generatePerformanceMetricsSection(metrics.performanceMetrics)}
        </div>
    `;
}

/**
 * Generate metric tables (GMB_REINSTATEMENT, GMB_VERIFICATION, REVIEW_REMOVAL)
 */
function generateMetricTables(metrics) {
    let tablesHtml = '';

    // GMB Reinstatement table
    if (metrics.gmb_reinstatement) {
        tablesHtml += `
            <div class="metric-section">
                <h3 class="section-title">${getMetricDisplayName(METRICS.GMB_REINSTATEMENT)}</h3>
                ${generateReinstatementTable(metrics.gmb_reinstatement)}
            </div>
        `;
    }

    // GMB Verification table
    if (metrics.gmb_verification) {
        tablesHtml += `
            <div class="metric-section">
                <h3 class="section-title">${getMetricDisplayName(METRICS.GMB_VERIFICATION)}</h3>
                ${generateVerificationTable(metrics.gmb_verification)}
            </div>
        `;
    }

    // Review Removal table
    if (metrics.review_removal) {
        tablesHtml += `
            <div class="metric-section">
                <h3 class="section-title">${getMetricDisplayName(METRICS.REVIEW_REMOVAL)}</h3>
                ${generateReviewRemovalTable(metrics.review_removal)}
            </div>
        `;
    }

    return tablesHtml;
}

/**
 * Generate performance metrics section grouped by location
 * Each location shows all its metrics with graphs
 */
function generatePerformanceMetricsSection(performanceMetrics) {
    if (!performanceMetrics || performanceMetrics.length === 0) {
        return '';
    }

    // Group locations across all metrics
    const locationMap = new Map();
    
    // Loop through each metric type
    performanceMetrics.forEach(metric => {
        if (!metric.locations) return;
        
        // Loop through each location for this metric
        metric.locations.forEach(location => {
            const locationKey = location.businessName || 'Unknown';
            
            if (!locationMap.has(locationKey)) {
                locationMap.set(locationKey, {
                    businessName: location.businessName,
                    locality: location.locality,
                    address: location.address,
                    metrics: []
                });
            }
            
            locationMap.get(locationKey).metrics.push({
                type: metric.type,
                metricName: metric.metricName,
                total: location.total,
                timeSeries: location.timeSeries,
                error: location.error
            });
        });
    });

    // Generate HTML for each location
    let locationsHtml = '';
    
    // Loop through each location
    locationMap.forEach((locationData, locationKey) => {
        // Create metrics summary table for this location only
        const locationMetricsData = locationData.metrics.map(metric => ({
            businessName: locationData.businessName,
            locality: locationData.locality,
            address: locationData.address,
            metricName: metric.metricName,
            metricType: metric.type,
            total: metric.total,
            error: metric.error
        }));
        
        locationsHtml += `
            <div class="location-section">
                <h3 class="location-title">
                    ${escapeHtml(locationData.businessName)}
                    ${locationData.locality ? ` - ${escapeHtml(locationData.locality)}` : ''}
                </h3>
                ${locationData.address ? `<p style="color: #6b7280; margin-bottom: 15px;">${escapeHtml(locationData.address)}</p>` : ''}
                
                <div class="metric-section">
                    <h4 class="section-title">Metrics Summary Table</h4>
                    ${generateLocationSummaryTable(locationMetricsData, 'Metrics')}
                </div>
                
                ${generateLocationMetrics(locationData.metrics)}
            </div>
        `;
    });

    return `
        <div class="metric-section">
            <h3 class="section-title">Google Performance Metrics by Location</h3>
            ${locationsHtml}
        </div>
    `;
}

/**
 * Generate all metrics for a single location
 * Loop through each metric and create a graph
 * Skip graphs if metric data is empty or has error
 */
function generateLocationMetrics(metrics) {
    // Loop through each metric for this location
    return metrics.map(metric => {
        // Skip if metric has error or no time series data
        if (metric.error || !metric.timeSeries || metric.timeSeries.length === 0) {
            return '';
        }
        
        return generateLocationChart(
            { timeSeries: metric.timeSeries },
            metric.metricName,
            metric.type
        );
    }).filter(html => html !== '').join('\n');
}

module.exports = {
    generateReportHTML,
};
