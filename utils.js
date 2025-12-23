const knex = require("/opt/nodejs/db");
const DatabaseTableConstants = require("/opt/nodejs/DatabaseTableConstants");
const FetchGoogleTokensUtils = require("/opt/nodejs/FetchGoogleTokensUtils");
const layerUtils = require("/opt/nodejs/utils");

class Utils {
    static getAccountIdIfHasAccess = async (organization_id, gmb_id) => {
        // TODO: Verify that the organization has access to the GMB ID if it is a agency also

        const orgGmbBridgeData = await knex(
            DatabaseTableConstants.GMB_LOCATION_ORGANIZATION_BRIDGE_TABLE,
        )
            .where({ organization_id, gmb_id })
            .first();

        if (!orgGmbBridgeData) {
            throw new Error("User does not have access to this GMB data.");
        }

        return orgGmbBridgeData.account_id;
    };

    static getGoogleToken = async (organization_id, gmb_id) => {
        const account_id = await Utils.getAccountIdIfHasAccess(organization_id, gmb_id);

        const token = await FetchGoogleTokensUtils
            .fetchValidGoogleAccessTokenViaAccountAndOrgId(account_id, organization_id);
        return token;
    }

    static createNotifications = async ({
        trx,
        organizationId = null,
        notificationType,
        data,
        adminOrgId = null,
    }) => {
        console.log("Creating notification:", {
            organizationId, notificationType, data, adminOrgId,
        });
        const notification_type_id = await layerUtils.getNotificationTypeId(
            notificationType,
            trx,
        );

        if (!notification_type_id) {
            throw new Error(`Notification type "${notificationType}" not found.`);
        }

        const notificationData = {
            data,
            notification_type_id,
        };
        const notifications = [];

        if (organizationId) {
            const orgUserIds = await layerUtils.getUserIdsByOrganizationId(
                organizationId,
                trx,
            );

            const userNotifications = orgUserIds.map((id) => ({
                organization_id: organizationId,
                user_id: id,
                ...notificationData,
            }));

            notifications.push(...userNotifications);
        }

        if (adminOrgId) {
            const adminUserIds = await layerUtils.getUserIdsByOrganizationId(
                adminOrgId,
                trx,
            );

            const adminNotifications = adminUserIds.map((id) => ({
                organization_id: adminOrgId,
                user_id: id,
                ...notificationData,
            }));

            notifications.push(...adminNotifications);
        }

        if (notifications.length > 0) {
            await trx(DatabaseTableConstants.NOTIFICATION_TABLE).insert(notifications);
        }
        console.log("Notifications created:", notifications.length);
    };

}
module.exports = Utils;
