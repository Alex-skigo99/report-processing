const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const knex = require("/opt/nodejs/db");
const DatabaseTableConstants = require("/opt/nodejs/DatabaseTableConstants");
const FetchGoogleTokensUtils = require("/opt/nodejs/FetchGoogleTokensUtils");
const layerS3BucketConstants = require("/opt/nodejs/S3BucketConstants");
const layerUtils = require("/opt/nodejs/utils");
const NotificationTypeConstants = require("/opt/nodejs/NotificationTypeConstants");
const WebSocketFlags = require("/opt/nodejs/WebsocketFlags");
const WebsocketUtils = require("/opt/nodejs/WebsocketUtils");
const SqsUtils = require("/opt/nodejs/SqsUtils");
const Utils = require("./utils");
const metricUtils = require("./metricUtils");
const { generateReportHTML } = require("./htmlGenerator");
const htmlPdf = require("html-pdf-node");

const s3 = new S3Client({});
const BUCKET = layerS3BucketConstants.REPORT_BUCKET;

exports.handler = async (event) => {
    console.log("Got an event!");
    console.log(event);

    const messages = event.Records.map(r => JSON.parse(r.body));
    const { report_id, organization_id, start_date, end_date, metrics, sub_accounts } = messages[0];

    let reportStatus = "failed";
    let pageCount = 0;

    try {
        console.log("Starting report generation for report_id:", report_id);

        // Fetch report details from database
        const reportRecord = await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .first();

        if (!reportRecord) {
            throw new Error(`Report with id ${report_id} not found`);
        }

        // Fetch organization name
        const organization = await knex(DatabaseTableConstants.ORGANIZATION_TABLE)
            .select("name")
            .where("id", organization_id)
            .first();

        // Parse metrics and sub_accounts if they're strings
        const metricsList = typeof metrics === "string" ? metrics.split(",").map(m => m.trim()) : metrics;
        const subAccountsList = typeof sub_accounts === "string" ? JSON.parse(sub_accounts) : sub_accounts;

        // Enrich sub_accounts with organization names
        const enrichedSubAccounts = await Promise.all(
            subAccountsList.map(async (subAccount) => {
                const info = await metricUtils.fetchSubAccountInfo(subAccount.sub_account_id);
                return {
                    ...subAccount,
                    name: info.name,
                };
            })
        );

        // Process all metrics for all sub-accounts
        console.log("Processing metrics...");
        const processedMetrics = [];

        for (const metric of metricsList) {
            const metricData = [];

            for (const subAccount of enrichedSubAccounts) {
                const result = await metricUtils.processMetric(metric, {
                    subAccount,
                    startDate: start_date,
                    endDate: end_date,
                    organizationId: organization_id,
                });

                metricData.push(result);
            }

            processedMetrics.push({
                type: metric,
                data: metricData,
                error: null,
            });
        }

        console.log("Metrics processed successfully");

        // Generate HTML
        console.log("Generating HTML...");
        const html = generateReportHTML({
            title: reportRecord.title,
            startDate: start_date,
            endDate: end_date,
            organizationName: organization?.name,
            metrics: processedMetrics,
        });

        // Generate PDF from HTML
        console.log("Generating PDF...");
        const options = {
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm",
            },
        };

        const file = { content: html };
        const pdfBuffer = await htmlPdf.generatePdf(file, options);

        // Calculate page count (approximate: 1 page ~= 3000 bytes for formatted content)
        pageCount = Math.max(1, Math.ceil(pdfBuffer.length / 3000));

        // Upload PDF to S3
        console.log("Uploading PDF to S3...");
        const s3Key = `${organization_id}/${report_id}.pdf`;
        
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: "application/pdf",
        }));

        console.log(`PDF uploaded to S3: ${BUCKET}/${s3Key}`);

        // Update report status to completed
        reportStatus = "completed";

        await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .update({
                status: reportStatus,
                page_count: pageCount,
                updated_at: knex.fn.now(),
            });

        console.log("Report status updated to completed");

        // Create notification
        await knex.transaction(async (trx) => {
            const notificationData = {
                id: report_id,
                title: reportRecord.title,
                page_count: pageCount,
                status: reportStatus,
            };

            await Utils.createNotifications({
                trx,
                organizationId: organization_id,
                notificationType: NotificationTypeConstants.NEW_REPORT,
                data: notificationData,
            });

            // Broadcast websocket message
            await WebsocketUtils.broadcastWebsocketMessageToOrganization(
                organization_id,
                WebSocketFlags.NEW_NOTIFICATION,
                notificationData,
                null,
            );

            console.log("Notification sent successfully");
        });

        console.log("Report generation completed successfully");

    } catch (error) {
        console.error("Error generating report:", error);
        reportStatus = "failed";

        // Update report status to failed
        await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .update({
                status: reportStatus,
                updated_at: knex.fn.now(),
            });

        // Create failure notification
        try {
            await knex.transaction(async (trx) => {
                const reportRecord = await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
                    .where("id", report_id)
                    .first();

                const notificationData = {
                    id: report_id,
                    title: reportRecord?.title || "Report",
                    page_count: 0,
                    status: reportStatus,
                };

                await Utils.createNotifications({
                    trx,
                    organizationId: organization_id,
                    notificationType: NotificationTypeConstants.NEW_REPORT,
                    data: notificationData,
                });

                // Broadcast websocket message for failure
                await WebsocketUtils.broadcastWebsocketMessageToOrganization(
                    organization_id,
                    WebSocketFlags.NEW_NOTIFICATION,
                    notificationData,
                    null,
                );
            });
        } catch (notificationError) {
            console.error("Error sending failure notification:", notificationError);
        }

        // Re-throw error for Lambda to mark it as failed
        throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Report generated", report_id, status: reportStatus }) };
};
