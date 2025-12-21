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

const s3 = new S3Client({});
const BUCKET = layerS3BucketConstants.REPORT_BUCKET;

exports.handler = async (event) => {
    console.log("Got an event!");
    console.log(event);

    const messages = event.Records.map(r => JSON.parse(r.body));

    const { report_id, organization_id, start_date, end_date, metrics, sub_accounts } = messages[0];


  return { statusCode: 200, body: '"OK"' };
};
