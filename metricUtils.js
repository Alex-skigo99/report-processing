const knex = require("/opt/nodejs/db");
const DatabaseTableConstants = require("/opt/nodejs/DatabaseTableConstants");
const FetchGoogleTokensUtils = require("/opt/nodejs/FetchGoogleTokensUtils");
const axios = require("axios");

class metricUtils {
    static get METRICS () {
        return {
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
    }

    static async processMetric(metricType, params) {
        const metricKey = metricType.toUpperCase().replace(/\./g, "_");
        
        try {
            if (metricType === this.METRICS.GMB_REINSTATEMENT) {
                return await this.processGMBReinstatement(params);
            } else if (metricType === this.METRICS.GMB_VERIFICATION) {
                return await this.processGMBVerification(params);
            } else if (metricType.startsWith("BUSINESS_IMPRESSIONS_") || 
                       ["CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS", 
                        "BUSINESS_CONVERSATIONS", "BUSINESS_BOOKINGS", "BUSINESS_FOOD_ORDERS",
                        "BUSINESS_FOOD_MENU_CLICKS"].includes(metricType)) {
                return await this.processGooglePerformance(params, metricType);
            }

            console.log(`No processor found for metric type: ${metricType}`);
            return {
                type: metricType,
                error: "Unsupported metric type",
                data: null,
            };
        } catch (error) {
            console.error(`Error processing metric ${metricType}:`, error);
            return {
                type: metricType,
                error: error.message,
                data: null,
            };
        }
    }

    static async processGMBReinstatement({ subAccount, startDate, endDate }) {
        const submissions = await knex(DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE)
            .select(
                `${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.google_listing_name`,
                `${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.updated_at`,
                `${DatabaseTableConstants.SUBMISSION_STATUS_TABLE}.human_readable_status as status`,
                `${DatabaseTableConstants.INVOICE_STATUS_TABLE}.human_readable_status as invoice_status`
            )
            .leftJoin(
                DatabaseTableConstants.SUBMISSION_STATUS_TABLE,
                `${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.status_id`,
                `${DatabaseTableConstants.SUBMISSION_STATUS_TABLE}.id`
            )
            .leftJoin(
                DatabaseTableConstants.INVOICE_STATUS_TABLE,
                `${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.invoice_status_id`,
                `${DatabaseTableConstants.INVOICE_STATUS_TABLE}.id`
            )
            .where(`${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.organization_id`, subAccount.sub_account_id)
            .whereBetween(`${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.updated_at`, [startDate, endDate])
            .orderBy(`${DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE}.updated_at`, "desc");

        return {
            type: this.METRICS.GMB_REINSTATEMENT,
            subAccountId: subAccount.sub_account_id,
            subAccountName: subAccount.name,
            submissions,
            totalCount: submissions.length,
            error: null,
        };
    }

    static async processGMBVerification({ subAccount, startDate, endDate }) {
        const submissions = await knex(DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE)
            .select(
                `${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.business_name`,
                `${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.updated_at`,
                `${DatabaseTableConstants.SUBMISSION_STATUS_TABLE}.human_readable_status as status`,
                `${DatabaseTableConstants.INVOICE_STATUS_TABLE}.human_readable_status as invoice_status`
            )
            .leftJoin(
                DatabaseTableConstants.SUBMISSION_STATUS_TABLE,
                `${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.status_id`,
                `${DatabaseTableConstants.SUBMISSION_STATUS_TABLE}.id`
            )
            .leftJoin(
                DatabaseTableConstants.INVOICE_STATUS_TABLE,
                `${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.invoice_status_id`,
                `${DatabaseTableConstants.INVOICE_STATUS_TABLE}.id`
            )
            .where(`${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.organization_id`, subAccount.sub_account_id)
            .whereBetween(`${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.updated_at`, [startDate, endDate])
            .orderBy(`${DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE}.updated_at`, "desc");

        return {
            type: this.METRICS.GMB_VERIFICATION,
            subAccountId: subAccount.sub_account_id,
            subAccountName: subAccount.name,
            submissions,
            totalCount: submissions.length,
            error: null,
        };
    }

    static async processGooglePerformance({ subAccount, startDate, endDate, organizationId }, dailyMetric) {
        const locations = await knex(DatabaseTableConstants.GMB_LOCATION_TABLE)
            .select("business_name", "locality", "address_lines", "gmb_id", "account_id")
            .whereIn("id", subAccount.locations)
            .orderBy("business_name");

        const locationData = [];

        for (const location of locations) {
            try {
                const timeSeries = await this.fetchGoogleMetricTimeSeries(
                    location.account_id,
                    organizationId,
                    location.gmb_id,
                    dailyMetric,
                    startDate,
                    endDate
                );

                locationData.push({
                    businessName: location.business_name,
                    locality: location.locality,
                    address: location.address_lines ? location.address_lines.join(", ") : "",
                    timeSeries,
                    total: this.calculateTotal(timeSeries),
                });
            } catch (error) {
                console.error(`Error fetching metrics for location ${location.business_name}:`, error);
                locationData.push({
                    businessName: location.business_name,
                    locality: location.locality,
                    address: location.address_lines ? location.address_lines.join(", ") : "",
                    error: error.message,
                    timeSeries: null,
                    total: 0,
                });
            }
        }

        return {
            type: dailyMetric,
            subAccountId: subAccount.sub_account_id,
            subAccountName: subAccount.name,
            metricName: this.formatMetricName(dailyMetric),
            locations: locationData,
            error: null,
        };
    }

    static async fetchGoogleMetricTimeSeries(accountId, organizationId, gmbId, dailyMetric, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const dailyRange = {
            startDate: {
                year: start.getFullYear(),
                month: start.getMonth() + 1,
                day: start.getDate(),
            },
            endDate: {
                year: end.getFullYear(),
                month: end.getMonth() + 1,
                day: end.getDate(),
            },
        };

        const url = this.buildGoogleMetricsUrl(gmbId, [dailyMetric], dailyRange);
        
        const googleAccessToken = await FetchGoogleTokensUtils
            .fetchValidGoogleAccessTokenViaAccountAndOrgId(accountId, organizationId);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${googleAccessToken}`,
            },
        });

        // Extract time series data
        if (response.data && response.data.multiDailyMetricTimeSeries && response.data.multiDailyMetricTimeSeries.length > 0) {
            return response.data.multiDailyMetricTimeSeries[0].timeSeries?.datedValues || [];
        }

        return [];
    }

    static buildGoogleMetricsUrl(gmbId, dailyMetrics, dailyRange) {
        const baseUrl = `https://businessprofileperformance.googleapis.com/v1/locations/${gmbId}:fetchMultiDailyMetricsTimeSeries`;
        const queryParams = new URLSearchParams();

        dailyMetrics.forEach((metric) => {
            queryParams.append("dailyMetrics", metric);
        });

        queryParams.append("dailyRange.startDate.year", dailyRange.startDate.year);
        queryParams.append("dailyRange.startDate.month", dailyRange.startDate.month);
        queryParams.append("dailyRange.startDate.day", dailyRange.startDate.day);
        queryParams.append("dailyRange.endDate.year", dailyRange.endDate.year);
        queryParams.append("dailyRange.endDate.month", dailyRange.endDate.month);
        queryParams.append("dailyRange.endDate.day", dailyRange.endDate.day);

        return `${baseUrl}?${queryParams.toString()}`;
    }

    static calculateTotal(timeSeries) {
        if (!timeSeries || !Array.isArray(timeSeries)) {
            return 0;
        }
        
        return timeSeries.reduce((sum, item) => {
            const value = parseInt(item.value, 10);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
    }

    static formatMetricName(metricKey) {
        const names = {
            BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "Desktop Maps Impressions",
            BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "Desktop Search Impressions",
            BUSINESS_IMPRESSIONS_MOBILE_MAPS: "Mobile Maps Impressions",
            BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "Mobile Search Impressions",
            CALL_CLICKS: "Call Clicks",
            WEBSITE_CLICKS: "Website Clicks",
            BUSINESS_DIRECTION_REQUESTS: "Direction Requests",
            BUSINESS_CONVERSATIONS: "Conversations",
            BUSINESS_BOOKINGS: "Bookings",
            BUSINESS_FOOD_ORDERS: "Food Orders",
            BUSINESS_FOOD_MENU_CLICKS: "Menu Clicks",
        };

        return names[metricKey] || metricKey;
    }

    static async fetchSubAccountInfo(subAccountId) {
        const org = await knex(DatabaseTableConstants.ORGANIZATION_TABLE)
            .select("name")
            .where("id", subAccountId)
            .first();

        return {
            name: org ? org.name : `Sub-Account ${subAccountId}`,
        };
    }
}

module.exports = metricUtils;
