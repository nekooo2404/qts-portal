import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

import { withDatabaseScope } from "./database.js";
import { portalFail } from "./portal-errors.js";

const INTERNAL_SCOPE = Object.freeze({ tenantId: null, isCrossTenant: true });

function membershipFromRow(row) {
  if (
    !row ||
    row.membership_status !== "ACTIVE" ||
    row.tenant_status !== "ACTIVE"
  ) return undefined;
  return {
    issuer: row.issuer,
    subject: row.subject,
    tenantId: row.tenant_id,
    role: row.role,
    workspace: row.workspace,
  };
}

function displayNameFromClaims(claims) {
  return typeof claims.name === "string" && claims.name.trim()
    ? claims.name.trim().slice(0, 180)
    : claims.email.trim().slice(0, 180);
}

async function expirePendingInvitations(client, { email, tenantId } = {}) {
  const parameters = [];
  const conditions = ["status = 'PENDING'", "expires_at <= CURRENT_TIMESTAMP"];
  if (tenantId) {
    parameters.push(tenantId);
    conditions.push(`tenant_id = $${parameters.length}`);
  }
  if (email) {
    parameters.push(email);
    conditions.push(`lower(email) = lower($${parameters.length})`);
  }
  await client.query(
    `UPDATE invitations
     SET status = 'EXPIRED',
         version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE ${conditions.join(" AND ")}`,
    parameters,
  );
}

export function createMembershipRepository(database) {
  if (!database) throw new Error("Membership repository requires a database.");

  return Object.freeze({
    async bootstrap(configuredMemberships = []) {
      if (configuredMemberships.length === 0) return;
      await withDatabaseScope(database, INTERNAL_SCOPE, async (client) => {
        for (const membership of configuredMemberships) {
          await client.query(
            `INSERT INTO tenants (id, name)
             VALUES ($1, $1)
             ON CONFLICT (id) DO NOTHING`,
            [membership.tenantId],
          );
          await client.query(
            `INSERT INTO memberships (issuer, subject, tenant_id, role, workspace)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (issuer, subject)
             DO UPDATE SET
               tenant_id = EXCLUDED.tenant_id,
               role = EXCLUDED.role,
               workspace = EXCLUDED.workspace,
               updated_at = CURRENT_TIMESTAMP`,
            [
              membership.issuer,
              membership.subject,
              membership.tenantId,
              membership.role,
              membership.workspace,
            ],
          );
        }
      });
    },

    async resolve({ claims, configuredMembership }) {
      return withDatabaseScope(database, INTERNAL_SCOPE, async (client) => {
        const existing = await client.query(
          `SELECT m.issuer, m.subject, m.tenant_id, m.role, m.workspace,
                  m.status AS membership_status, t.status AS tenant_status
           FROM memberships m
           JOIN tenants t ON t.id = m.tenant_id
           WHERE m.issuer = $1 AND m.subject = $2`,
          [claims.iss, claims.sub],
        );
        if (existing.rowCount > 0) {
          const membership = membershipFromRow(existing.rows[0]);
          if (!membership) return undefined;
          await client.query(
            `UPDATE memberships
             SET email = $3,
                 display_name = $4,
                 last_login_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE issuer = $1 AND subject = $2`,
            [claims.iss, claims.sub, claims.email.trim(), displayNameFromClaims(claims)],
          );
          return membership;
        }

        if (configuredMembership) {
          await client.query(
            `INSERT INTO tenants (id, name)
             VALUES ($1, $1)
             ON CONFLICT (id) DO NOTHING`,
            [configuredMembership.tenantId],
          );
          await client.query(
            `INSERT INTO memberships (
               issuer, subject, tenant_id, role, workspace,
               email, display_name, last_login_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              claims.iss,
              claims.sub,
              configuredMembership.tenantId,
              configuredMembership.role,
              configuredMembership.workspace,
              claims.email.trim(),
              displayNameFromClaims(claims),
            ],
          );
          const tenant = await client.query(
            "SELECT status FROM tenants WHERE id = $1",
            [configuredMembership.tenantId],
          );
          return tenant.rows[0]?.status === "ACTIVE" ? configuredMembership : undefined;
        }

        await expirePendingInvitations(client, { email: claims.email.trim() });
        const invitation = await client.query(
          `SELECT i.id, i.tenant_id, i.role, i.workspace
           FROM invitations i
           JOIN tenants t ON t.id = i.tenant_id
           WHERE lower(i.email) = lower($1)
             AND i.status = 'PENDING'
             AND i.expires_at > CURRENT_TIMESTAMP
             AND t.status = 'ACTIVE'
           ORDER BY i.created_at
           LIMIT 1
           FOR UPDATE SKIP LOCKED`,
          [claims.email.trim()],
        );
        if (invitation.rowCount === 0) return undefined;

        const invite = invitation.rows[0];
        await client.query(
          `INSERT INTO memberships (
             issuer, subject, tenant_id, role, workspace,
             email, display_name, last_login_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            claims.iss,
            claims.sub,
            invite.tenant_id,
            invite.role,
            invite.workspace,
            claims.email.trim(),
            displayNameFromClaims(claims),
          ],
        );
        const accepted = await client.query(
          `UPDATE invitations
           SET status = 'ACCEPTED',
               accepted_issuer = $2,
               accepted_subject = $3,
               accepted_at = CURRENT_TIMESTAMP,
               version = version + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND status = 'PENDING'
             AND expires_at > CURRENT_TIMESTAMP`,
          [invite.id, claims.iss, claims.sub],
        );
        if (accepted.rowCount !== 1) {
          portalFail(403, "INVITATION_EXPIRED", "Lời mời đã hết hạn.");
        }
        await client.query(
          `INSERT INTO audit_events (
             tenant_id, actor_issuer, actor_subject, actor_role, action,
             resource_type, resource_id, outcome, metadata
           ) VALUES ($1, $2, $3, $4, 'members.invitation_accept',
                     'invitations', $5, 'SUCCESS', $6::jsonb)`,
          [
            invite.tenant_id,
            claims.iss,
            claims.sub,
            invite.role,
            invite.id,
            JSON.stringify({ role: invite.role, workspace: invite.workspace }),
          ],
        );
        return {
          issuer: claims.iss,
          subject: claims.sub,
          tenantId: invite.tenant_id,
          role: invite.role,
          workspace: invite.workspace,
        };
      });
    },

    async validateSession(record) {
      const identity = record?.identity;
      const authorization = record?.authorization;
      if (
        typeof identity?.issuer !== "string" ||
        typeof identity?.subject !== "string" ||
        typeof authorization?.tenantId !== "string" ||
        typeof authorization?.role !== "string" ||
        typeof authorization?.workspace !== "string"
      ) return false;

      return withDatabaseScope(database, INTERNAL_SCOPE, async (client) => {
        const result = await client.query(
          `SELECT 1
           FROM memberships m
           JOIN tenants t ON t.id = m.tenant_id
           WHERE m.issuer = $1
             AND m.subject = $2
             AND m.tenant_id = $3
             AND m.role = $4
             AND m.workspace = $5
             AND m.status = 'ACTIVE'
             AND t.status = 'ACTIVE'`,
          [
            identity.issuer,
            identity.subject,
            authorization.tenantId,
            authorization.role,
            authorization.workspace,
          ],
        );
        return result.rowCount === 1;
      });
    },

    async createInvitation({ tenantId, email, role, workspace, actor, context, expiresAt, scope }) {
      const id = randomUUID();
      return withDatabaseScope(database, scope, async (client) => {
        await expirePendingInvitations(client, { email, tenantId });
        const result = await client.query(
          `INSERT INTO invitations (
             id, tenant_id, email, role, workspace, expires_at,
             created_by_issuer, created_by_subject
           ) VALUES ($1, $2, lower($3), $4, $5, $6, $7, $8)
           RETURNING id,
                     tenant_id AS "tenantId",
                     email,
                     role,
                     workspace,
                     status,
                     version,
                     expires_at AS "expiresAt",
                     created_at AS "createdAt",
                     updated_at AS "updatedAt"`,
          [
            id,
            tenantId,
            email,
            role,
            workspace,
            expiresAt,
            actor.identity.issuer,
            actor.identity.subject,
          ],
        );
        const address = context?.ipAddress;
        await client.query(
          `INSERT INTO audit_events (
             tenant_id, actor_issuer, actor_subject, actor_role, action,
             resource_type, resource_id, outcome, request_id, ip_address, metadata
           ) VALUES ($1, $2, $3, $4, 'members.invite', 'invitations', $5,
                     'SUCCESS', $6, $7, $8::jsonb)`,
          [
            tenantId,
            actor.identity.issuer,
            actor.identity.subject,
            actor.authorization.role,
            id,
            context?.requestId ?? null,
            typeof address === "string" && isIP(address) ? address : null,
            JSON.stringify({ role, workspace }),
          ],
        );
        return result.rows[0];
      });
    },

    async revokeInvitation({ actor, context, expectedVersion, id, scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const parameters = [id];
        const tenantClause = scope.tenantId
          ? ` AND tenant_id = $${parameters.push(scope.tenantId)}`
          : "";
        const existing = await client.query(
          `SELECT id, tenant_id, email, role, workspace, status, version,
                  expires_at <= CURRENT_TIMESTAMP AS expired
           FROM invitations
           WHERE id = $1${tenantClause}
           FOR UPDATE`,
          parameters,
        );
        if (existing.rowCount === 0) {
          portalFail(404, "INVITATION_NOT_FOUND", "Không tìm thấy lời mời.");
        }
        const invitation = existing.rows[0];
        if (
          actor.authorization.workspace === "client" &&
          invitation.workspace !== "client"
        ) {
          portalFail(403, "PERMISSION_DENIED", "Không được quản lý lời mời nội bộ.");
        }
        if (invitation.version !== expectedVersion) {
          portalFail(409, "VERSION_CONFLICT", "Lời mời đã thay đổi; hãy tải lại.");
        }
        if (invitation.status !== "PENDING") {
          portalFail(409, "INVITATION_NOT_PENDING", "Chỉ có thể thu hồi lời mời đang chờ.");
        }
        if (invitation.expired) {
          portalFail(409, "INVITATION_EXPIRED", "Lời mời đã hết hạn.");
        }

        const result = await client.query(
          `UPDATE invitations
           SET status = 'REVOKED',
               revoked_at = CURRENT_TIMESTAMP,
               revoked_by_issuer = $2,
               revoked_by_subject = $3,
               version = version + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND version = $4 AND status = 'PENDING'
           RETURNING id,
                     tenant_id AS "tenantId",
                     email,
                     role,
                     workspace,
                     status,
                     version,
                     expires_at AS "expiresAt",
                     revoked_at AS "revokedAt",
                     created_at AS "createdAt",
                     updated_at AS "updatedAt"`,
          [
            id,
            actor.identity.issuer,
            actor.identity.subject,
            expectedVersion,
          ],
        );
        if (result.rowCount === 0) {
          portalFail(409, "VERSION_CONFLICT", "Lời mời đã thay đổi; hãy tải lại.");
        }
        const address = context?.ipAddress;
        await client.query(
          `INSERT INTO audit_events (
             tenant_id, actor_issuer, actor_subject, actor_role, action,
             resource_type, resource_id, outcome, request_id, ip_address, metadata
           ) VALUES ($1, $2, $3, $4, 'members.invitation_revoke', 'invitations',
                     $5, 'SUCCESS', $6, $7, $8::jsonb)`,
          [
            invitation.tenant_id,
            actor.identity.issuer,
            actor.identity.subject,
            actor.authorization.role,
            id,
            context?.requestId ?? null,
            typeof address === "string" && isIP(address) ? address : null,
            JSON.stringify({ role: invitation.role, workspace: invitation.workspace }),
          ],
        );
        return result.rows[0];
      });
    },
  });
}

export function createAuthAuditWriter(database) {
  return async function writeAuthAudit(event) {
    const actionByEvent = {
      auth_membership_not_found: ["auth.membership_not_found", "DENIED"],
      auth_login_succeeded: ["auth.login", "SUCCESS"],
      auth_logout_succeeded: ["auth.logout", "SUCCESS"],
      auth_session_revoked: ["auth.session_revoked", "DENIED"],
    };
    const [action, outcome] = actionByEvent[event.event] ?? ["auth.unknown", "FAILURE"];
    const metadata = {};
    if (event.email) metadata.email = event.email;

    await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      `INSERT INTO audit_events (
         tenant_id, actor_issuer, actor_subject, actor_role,
         action, resource_type, outcome, metadata
       ) VALUES ($1, $2, $3, $4, $5, 'session', $6, $7::jsonb)`,
      [
        event.tenantId ?? null,
        event.issuer ?? null,
        event.subject ?? null,
        event.role ?? null,
        action,
        outcome,
        JSON.stringify(metadata),
      ],
    ));
  };
}
