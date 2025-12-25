const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const knex = require("/opt/nodejs/db");
const DatabaseTableConstants = require("/opt/nodejs/DatabaseTableConstants");
const layerS3BucketConstants = require("/opt/nodejs/S3BucketConstants");
const NotificationTypeConstants = require("/opt/nodejs/NotificationTypeConstants");
const WebSocketFlags = require("/opt/nodejs/WebsocketFlags");
const WebsocketUtils = require("/opt/nodejs/WebsocketUtils");
const Utils = require("./utils");
const metricUtils = require("./metricUtils");
const { generateReportHTML } = require("./htmlGenerator");
const pdf = require("pdf-creator-node");

const s3 = new S3Client({});
const BUCKET = layerS3BucketConstants.REPORT_BUCKET;

exports.handler = async (event) => {
    console.log("Got an event!");
    console.log(event);

    const messages = event.Records.map(r => JSON.parse(r.body));
    const { report_id, agency_id, start_date, end_date, metrics, sub_accounts } = messages[0];

    let reportStatus = "failed";

    const trx = await knex.transaction();

    try {
        console.log("Starting report generation for report_id:", report_id);

        const reportRecord = await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .first();

        if (!reportRecord) {
            throw new Error(`Report with id ${report_id} not found`);
        }

        const organization = await knex(DatabaseTableConstants.ORGANIZATION_TABLE)
            .select("name")
            .where("id", agency_id)
            .first();

        const metricsList = typeof metrics === "string" ? metrics.split(",").map(m => m.trim()) : metrics;
        const subAccountsList = typeof sub_accounts === "string" ? JSON.parse(sub_accounts) : sub_accounts;

        // Enrich sub_accounts with organization names
        const enrichedSubAccounts = await Promise.all(
            subAccountsList.map(async (subAccount) => {
                const info = await metricUtils.fetchSubAccountInfo(subAccount.sub_account);
                return {
                    ...subAccount,
                    name: info.name,
                };
            })
        );

        console.log("Processing metrics...");
        const processedMetrics = [];

        for (const metric of metricsList) {
            const metricData = [];

            for (const subAccount of enrichedSubAccounts) {
                const result = await metricUtils.processMetric(metric, {
                    subAccount,
                    startDate: start_date,
                    endDate: end_date,
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

        console.log("Generating HTML...");
        const html = generateReportHTML({
            title: reportRecord.title,
            startDate: start_date,
            endDate: end_date,
            organizationName: organization?.name,
            metrics: processedMetrics,
        });

        console.log("Generating PDF...");
        const document = {
            html: html,
            data: {},
            type: "buffer",
        };

        const options = {
            format: "A4",
            orientation: "portrait",
            border: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm",
            },
        };

        const pdfBuffer = await pdf.create(document, options);
        console.log("PDF generated successfully");

        reportStatus = "completed";

        await trx(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .update({
                status: reportStatus,
                updated_at: knex.fn.now(),
            });

        console.log("Report status updated to completed");

        const notificationData = {
            id: report_id,
            title: reportRecord.title,
            status: reportStatus,
        };

        await Utils.createNotifications({
            trx,
            organizationId: agency_id,
            notificationType: NotificationTypeConstants.NEW_REPORT,
            data: notificationData,
        });
        console.log("Notification sent successfully");

        console.log("Uploading PDF to S3...");
        const s3Key = `${agency_id}/${report_id}`;
        
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: "application/pdf",
        }));
        console.log(`PDF uploaded to S3: ${BUCKET}/${s3Key}`);

        await trx.commit();

        await WebsocketUtils.broadcastWebsocketMessageToOrganization(
            agency_id,
            WebSocketFlags.NEW_NOTIFICATION,
            notificationData,
            {},
        );
        console.log("Websocket message sent successfully");

        console.log("Report generation completed successfully");

    } catch (error) {
        await trx.rollback();
        console.error("Error generating report:", error);
        reportStatus = "failed";

        await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
            .where("id", report_id)
            .update({
                status: reportStatus,
                updated_at: knex.fn.now(),
            });

        try {
            await knex.transaction(async (trx) => {
                const reportRecord = await knex(DatabaseTableConstants.AGENCY_REPORT_TABLE)
                    .where("id", report_id)
                    .first();

                const notificationData = {
                    id: report_id,
                    title: reportRecord?.title || "Report",
                    status: reportStatus,
                };

                await Utils.createNotifications({
                    trx,
                    organizationId: agency_id,
                    notificationType: NotificationTypeConstants.NEW_REPORT,
                    data: notificationData,
                });

                await WebsocketUtils.broadcastWebsocketMessageToOrganization(
                    agency_id,
                    WebSocketFlags.NEW_NOTIFICATION,
                    notificationData,
                    {},
                );
            });
        } catch (notificationError) {
            console.error("Error sending failure notification:", notificationError);
        }

        // Re-throw error for Lambda to mark it as failed
        throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Report generated" }) };
};
