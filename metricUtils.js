const knex = require("/opt/nodejs/db");
const DatabaseTableConstants = require("/opt/nodejs/DatabaseTableConstants");
const axios = require("axios");
const Utils = require("./utils");
const { METRICS, isGooglePerformanceMetric } = require("./metricConstants");

class metricUtils {
    static get METRICS () {
        return METRICS;
    }

    static async processMetric(metricType, params) {        
        try {
            if (metricType === this.METRICS.GMB_REINSTATEMENT) {
                return await this.processGMBReinstatement(params);

            } else if (metricType === this.METRICS.GMB_VERIFICATION) {
                return await this.processGMBVerification(params);

            } else if (metricType === this.METRICS.REVIEW_REMOVAL) {
                return await this.processReviewRemoval(params);

            } else if (isGooglePerformanceMetric(metricType)) {
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
        const submissions = await knex({r: DatabaseTableConstants.REINSTATEMENT_WIZARD_SUBMISSION_TABLE})
            .leftJoin(
                {s: DatabaseTableConstants.SUBMISSION_STATUS_TABLE},
                "r.status_id",
                "s.id"
            )
            .leftJoin(
                {i: DatabaseTableConstants.INVOICE_STATUS_TABLE},
                "r.invoice_status_id",
                "i.id"
            )
            .select(
                "r.google_listing_name",
                "r.updated_at",
                "s.human_readable_status as status",
                "i.human_readable_status as invoice_status"
            )
            .where("r.organization_id", subAccount.sub_account)
            .whereBetween("r.updated_at", [startDate, endDate])
            .orderBy("r.updated_at", "desc");

        return {
            type: this.METRICS.GMB_REINSTATEMENT,
            subAccountId: subAccount.sub_account,
            subAccountName: subAccount.name,
            submissions,
            totalCount: submissions.length,
            error: null,
        };
    }

    static async processGMBVerification({ subAccount, startDate, endDate }) {
        const submissions = await knex({ n: DatabaseTableConstants.NEW_GMB_LOCATION_WIZARD_SUBMISSION_TABLE })
            .leftJoin(
            { s: DatabaseTableConstants.SUBMISSION_STATUS_TABLE },
                "n.status_id",
                "s.id"
            )
            .leftJoin(
            { i: DatabaseTableConstants.INVOICE_STATUS_TABLE },
                "n.invoice_status_id",
                "i.id"
            )
            .select(
                "n.business_name",
                "n.updated_at",
                "s.human_readable_status as status",
                "i.human_readable_status as invoice_status"
            )
            .where("n.organization_id", subAccount.sub_account)
            .whereBetween("n.updated_at", [startDate, endDate])
            .orderBy("n.updated_at", "desc");

        return {
            type: this.METRICS.GMB_VERIFICATION,
            subAccountId: subAccount.sub_account,
            subAccountName: subAccount.name,
            submissions,
            totalCount: submissions.length,
            error: null,
        };
    }

    static async processReviewRemoval({ subAccount, startDate, endDate }) {
        const submissions = await knex({ r: DatabaseTableConstants.REVIEW_REMOVAL_REQUEST_TABLE })
            .leftJoin(
                { g: DatabaseTableConstants.GMB_LOCATION_TABLE },
                "r.gmb_id",
                "g.id"
            )
            .leftJoin(
                { i: DatabaseTableConstants.INVOICE_STATUS_TABLE },
                "r.invoice_status_id",
                "i.id"
            )
            .select(
                "g.business_name",
                "r.review_link",
                "r.updated_at",
                "r.status",
                "i.human_readable_status as invoice_status"
            )
            .where("r.organization_id", subAccount.sub_account)
            .whereBetween("r.updated_at", [startDate, endDate])
            .orderBy("r.updated_at", "desc");

        return {
            type: this.METRICS.REVIEW_REMOVAL,
            subAccountId: subAccount.sub_account,
            subAccountName: subAccount.name,
            submissions,
            totalCount: submissions.length,
            error: null,
        };
    }

    static async processGooglePerformance({ subAccount, startDate, endDate }, dailyMetric) {
        const locations = await knex(DatabaseTableConstants.GMB_LOCATION_TABLE)
            .select("business_name", "locality", "address_lines", "id")
            .whereIn("id", subAccount.locations)
            .orderBy("business_name");

        const googleToken = await Utils.getGoogleToken(subAccount.sub_account, locations[0].id);

        if (!googleToken) {
            throw new Error("No valid Google access token found for the organization and GMB location.");
        }

        const locationData = [];

        for (const location of locations) {
            try {
                const timeSeries = await this.fetchGoogleMetricTimeSeries(
                    googleToken,
                    location.id,
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

    static async fetchGoogleMetricTimeSeries(googleToken, gmbId, dailyMetric, startDate, endDate) {
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
        
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${googleToken}`,
            },
        });

        console.log(`Fetched Google metric time series for GMB ID ${gmbId}, Metric ${dailyMetric}:`, response.data);
        // Extract time series data
        if (response.data && response.data.multiDailyMetricTimeSeries && response.data.multiDailyMetricTimeSeries.length > 0) {
            const datedValuesForMetric = response.data.multiDailyMetricTimeSeries[0].dailyMetricTimeSeries.find((series) =>
                series.dailyMetric === dailyMetric
            )?.timeSeries?.datedValues || [];
            console.log("Dated values data:", datedValuesForMetric);
            return datedValuesForMetric;
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
