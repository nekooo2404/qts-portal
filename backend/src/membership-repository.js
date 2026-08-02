import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

import { withDatabaseScope } from "./database.js";

const INTERNAL_SCOPE = Object.freeze({ tenantId: null, isCrossTenant: true });

function membershipFromRow(row) {
  if (!row || row.status !== "ACTIVE") return undefined;
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
          `SELECT issuer, subject, tenant_id, role, workspace, status
           FROM memberships
           WHERE issuer = $1 AND subject = $2`,
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
          return configuredMembership;
        }

        const invitation = await client.query(
          `SELECT id, tenant_id, role, workspace
           FROM invitations
           WHERE lower(email) = lower($1)
             AND status = 'PENDING'
             AND expires_at > CURRENT_TIMESTAMP
           ORDER BY created_at
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
        await client.query(
          `UPDATE invitations
           SET status = 'ACCEPTED',
               accepted_issuer = $2,
               accepted_subject = $3,
               accepted_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [invite.id, claims.iss, claims.sub],
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

    async createInvitation({ tenantId, email, role, workspace, actor, context, expiresAt, scope }) {
      const id = randomUUID();
      return withDatabaseScope(database, scope, async (client) => {
        const result = await client.query(
          `INSERT INTO invitations (
             id, tenant_id, email, role, workspace, expires_at,
             created_by_issuer, created_by_subject
           ) VALUES ($1, $2, lower($3), $4, $5, $6, $7, $8)
           RETURNING id, tenant_id, email, role, workspace, status, expires_at, created_at`,
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
  });
}

export function createAuthAuditWriter(database) {
  return async function writeAuthAudit(event) {
    const actionByEvent = {
      auth_membership_not_found: ["auth.membership_not_found", "DENIED"],
      auth_login_succeeded: ["auth.login", "SUCCESS"],
      auth_logout_succeeded: ["auth.logout", "SUCCESS"],
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
