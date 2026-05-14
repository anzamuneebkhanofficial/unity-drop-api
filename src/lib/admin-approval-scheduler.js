/** @format */
/**
 * ─── ADMIN APPROVAL AUTO-DELETE SCHEDULER ─────────────────────────────────────
 * Runs every 30 minutes.
 * Finds all admins where:
 *   - approvalStatus === 'pending'
 *   - approvalExpiresAt has passed
 * Sends them a rejection email and permanently removes them from the database.
 *
 * NOTE: This uses setInterval (no extra npm package needed).
 *       It is started once when the server boots in server.js.
 */

import Admin from '../models/admin-model.js';
import sendEmail from '../services/email/email-helper.js';
import Logger from '../utils/logger.js';

const INTERVAL_MS = 30 * 60 * 1000; // Run every 30 minutes

const runApprovalCleanup = async () => {
  try {
    const now = new Date();

    // Find all expired pending admins
    const expiredAdmins = await Admin.find({
      approvalStatus: 'pending',
      approvalExpiresAt: { $lte: now, $ne: null },
      isSuperAdmin: false,
    });

    if (expiredAdmins.length === 0) {
      Logger.info('[ApprovalScheduler] No expired pending admins found.');
      return;
    }

    Logger.info(
      `[ApprovalScheduler] Found ${expiredAdmins.length} expired pending admin(s). Removing...`
    );

    for (const admin of expiredAdmins) {
      const { email, fullName, _id } = admin;

      // Delete from DB first
      await Admin.findByIdAndDelete(_id);
      Logger.info(`[ApprovalScheduler] Deleted expired admin: ${fullName} (${email})`);

      // Send email notification (non-blocking)
      try {
        await sendEmail({
          to: email,
          subject: '⏰ Admin Account Removed — Approval Window Expired',
          html: `
            <h2>Hello ${fullName},</h2>
            <p>Unfortunately, your admin account on UnityDrop has been <strong>automatically removed</strong>.</p>
            <p>This happened because the Super Admin did not approve or reject your account within the required <strong>24-hour window</strong>.</p>
            <p>If you still wish to become an admin, please register again and contact the Super Admin promptly.</p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `,
        });
      } catch (emailErr) {
        Logger.error(
          `[ApprovalScheduler] Could not send expiry email to ${email}:`,
          emailErr.message
        );
      }
    }

    Logger.info(`[ApprovalScheduler] Cleanup complete. Removed ${expiredAdmins.length} admin(s).`);
  } catch (err) {
    Logger.error('[ApprovalScheduler] Error during cleanup:', err.message);
  }
};

/**
 * Call this once at server startup to start the scheduler.
 */
export const startAdminApprovalScheduler = () => {
  Logger.info('[ApprovalScheduler] Admin approval cleanup scheduler started (every 30 min).');
  // Run once immediately at startup, then every 30 minutes
  runApprovalCleanup();
  setInterval(runApprovalCleanup, INTERVAL_MS);
};
