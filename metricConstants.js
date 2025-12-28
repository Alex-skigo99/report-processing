/**
 * Centralized constants for all metric types
 * Used across metricUtils, htmlGenerator, and other modules
 */
const METRICS = {
    GMB_REINSTATEMENT: "gmb_reinstatement",
    GMB_VERIFICATION: "gmb_verification",
    REVIEW_REMOVAL: "review_removal",
    GOOGLE_PERFORMANCE: {
        DESKTOP_MAPS: "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
        DESKTOP_SEARCH: "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
        MOBILE_MAPS: "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
        MOBILE_SEARCH: "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
        BUSINESS_CONVERSATIONS: "BUSINESS_CONVERSATIONS",
        BUSINESS_DIRECTION_REQUESTS: "BUSINESS_DIRECTION_REQUESTS",
        CALL_CLICKS: "CALL_CLICKS",
        WEBSITE_CLICKS: "WEBSITE_CLICKS",
        BUSINESS_BOOKINGS: "BUSINESS_BOOKINGS",
        BUSINESS_FOOD_ORDERS: "BUSINESS_FOOD_ORDERS",
        BUSINESS_FOOD_MENU_CLICKS: "BUSINESS_FOOD_MENU_CLICKS",
    },
};

/**
 * Display names for metrics
 */
const METRIC_DISPLAY_NAMES = {
    [METRICS.GMB_REINSTATEMENT]: "GMB Reinstatement Submissions",
    [METRICS.GMB_VERIFICATION]: "GMB Verification Submissions",
    [METRICS.REVIEW_REMOVAL]: "Review Removal Requests",
    [METRICS.GOOGLE_PERFORMANCE.DESKTOP_MAPS]: "Desktop Maps Impressions",
    [METRICS.GOOGLE_PERFORMANCE.DESKTOP_SEARCH]: "Desktop Search Impressions",
    [METRICS.GOOGLE_PERFORMANCE.MOBILE_MAPS]: "Mobile Maps Impressions",
    [METRICS.GOOGLE_PERFORMANCE.MOBILE_SEARCH]: "Mobile Search Impressions",
    [METRICS.GOOGLE_PERFORMANCE.CALL_CLICKS]: "Call Clicks",
    [METRICS.GOOGLE_PERFORMANCE.WEBSITE_CLICKS]: "Website Clicks",
    [METRICS.GOOGLE_PERFORMANCE.BUSINESS_DIRECTION_REQUESTS]: "Direction Requests",
    [METRICS.GOOGLE_PERFORMANCE.BUSINESS_CONVERSATIONS]: "Conversations",
    [METRICS.GOOGLE_PERFORMANCE.BUSINESS_BOOKINGS]: "Bookings",
    [METRICS.GOOGLE_PERFORMANCE.BUSINESS_FOOD_ORDERS]: "Food Orders",
    [METRICS.GOOGLE_PERFORMANCE.BUSINESS_FOOD_MENU_CLICKS]: "Menu Clicks",
};

/**
 * Check if a metric is a Google Performance metric
 */
function isGooglePerformanceMetric(metricType) {
    return Object.values(METRICS.GOOGLE_PERFORMANCE).includes(metricType);
}

/**
 * Get display name for a metric type
 */
function getMetricDisplayName(metricType) {
    return METRIC_DISPLAY_NAMES[metricType] || metricType;
}

module.exports = {
    METRICS,
    METRIC_DISPLAY_NAMES,
    isGooglePerformanceMetric,
    getMetricDisplayName,
};
