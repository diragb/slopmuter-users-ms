// Packages:
import { pool } from '../../config/db'

// Typescript:
import type { QueryResultRow } from 'pg'
import type { Report, ReportStatus } from '../../types'

// Functions:
const mapReportRow = (row: QueryResultRow): Report => {
  const reportedAt = row['reportedAt']

  return {
    id: Number(row['id']),
    targetUsernameHash: String(row['targetUsernameHash']),
    targetUsername: String(row['targetUsername']),
    reporterUserId: Number(row['reporterUserId']),
    reporterRepAtTime: Number(row['reporterRepAtTime']),
    categoryMask: String(row['categoryMask']),
    tweetUrl: String(row['tweetUrl']),
    note: row['note'] === null ? null : String(row['note']),
    offenseNumber: Number(row['offenseNumber']),
    status: row['status'] as ReportStatus,
    reportedAt: reportedAt instanceof Date ? reportedAt.toISOString() : String(reportedAt),
  }
}

/**
 * Returns all reports filed by the given user (non-anonymized rows only).
 * Used for GDPR data export (`GET /v1/users/me/export`).
 */
const findReportsByReporterUserId = async (reporterUserId: number): Promise<Report[]> => {
  const result = await pool.query(
    `
      SELECT
        id,
        target_username_hash AS "targetUsernameHash",
        target_username AS "targetUsername",
        reporter_user_id AS "reporterUserId",
        reporter_rep_at_time AS "reporterRepAtTime",
        category_mask::text AS "categoryMask",
        tweet_url AS "tweetUrl",
        note,
        offense_number AS "offenseNumber",
        status,
        reported_at AS "reportedAt"
      FROM reports
      WHERE reporter_user_id = $1
      ORDER BY reported_at ASC, id ASC
    `,
    [reporterUserId],
  )

  return result.rows.map(mapReportRow)
}

// Exports:
export { findReportsByReporterUserId }
