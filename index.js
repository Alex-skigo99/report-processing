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
const { generateReportHTML } = require("./htmlGenerator/index");
const { METRICS, isGooglePerformanceMetric } = require("./metricConstants");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

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

        console.log("Processing metrics grouped by sub-account...");
        
        // Restructure data: Group by sub-account instead of by metric
        const subAccountsData = [];

        for (const subAccount of enrichedSubAccounts) {
            console.log(`Processing sub-account: ${subAccount.name}`);
            
            const subAccountMetrics = {
                gmb_reinstatement: null,
                gmb_verification: null,
                review_removal: null,
                performanceMetrics: []
            };

            // Process each metric for this sub-account
            for (const metricType of metricsList) {
                const result = await metricUtils.processMetric(metricType, {
                    subAccount,
                    startDate: start_date,
                    endDate: end_date,
                });

                console.log(`Processed metric ${metricType} for sub-account ${subAccount.name}`);

                // Organize metrics by type
                if (metricType === METRICS.GMB_REINSTATEMENT) {
                    subAccountMetrics.gmb_reinstatement = result;
                } else if (metricType === METRICS.GMB_VERIFICATION) {
                    subAccountMetrics.gmb_verification = result;
                } else if (metricType === METRICS.REVIEW_REMOVAL) {
                    subAccountMetrics.review_removal = result;
                } else if (isGooglePerformanceMetric(metricType)) {
                    subAccountMetrics.performanceMetrics.push(result);
                }
            }

            subAccountsData.push({
                id: subAccount.sub_account,
                name: subAccount.name,
                metrics: subAccountMetrics
            });
        }

        console.log("Metrics processed successfully");

        console.log("Generating HTML...");
        const html = generateReportHTML({
            title: reportRecord.title,
            startDate: start_date,
            endDate: end_date,
            organizationName: organization?.name,
            subAccounts: subAccountsData,
        });

        console.log("HTML generated successfully");
        console.log(html);

        console.log("Generating PDF...");
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm",
            },
        });

        await browser.close();
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
                console.log("Failure websocket message sent successfully");
            });
        } catch (notificationError) {
            console.error("Error sending failure notification:", notificationError);

            return { statusCode: 200, body: JSON.stringify({ message: "Error generating a report" }) };
        }
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Report generated" }) };
};
