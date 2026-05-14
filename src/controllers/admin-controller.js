import Logger from '../utils/logger.js';
/** @format */
import config from '../config/env.js';
import cache, { resetEntireCache } from '../config/cache.js';
import { CacheNamespaces } from '../utils/cache-keys.js';

import Admin from '../models/admin-model.js';
import Otp from '../models/otp-model.js';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  generateTokens,
  setTokensCookies,
  clearTokensCookies,
} from '../services/token/token-service.js';
import { performLogin } from '../services/auth-utilities.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import PasswordVerificationEmail from '../services/email/password-verify-email.js';
import PasswordVerifyModel from '../models/password-verify-model.js';
import Donor from '../models/donor-model.js';
import Patient from '../models/patient-model.js';
import sendEmail from '../services/email/email-helper.js';
import DonorRequest from '../models/donor-request-model.js';

import feedbackModel from '../models/feedback-model.js';
import crypto from 'crypto';
import EmailVerification from '../services/email/email-verification.js';
import { normalizeGender } from '../utils/blood-helpers.js';

/**
 * ✅ VERY IMPORTANT: Clear All Data
 * The user wants us to NEVER show old data after making a change.
 * This function clears 100% of the app's saved memory (cache).
 */

const GetAdminStatus = async (req, res) => {
  try {
    const ADMIN_QUOTA_LIMIT = parseInt(process.env.ADMIN_QUOTA_LIMIT) || 4;
    const adminCount = await Admin.countDocuments();
    res.status(200).json({
      success: true,
      currentCount: adminCount,
      limitReached: adminCount >= ADMIN_QUOTA_LIMIT
    });
  } catch (error) {
    Logger.error('GetAdminStatus error:', error.message);
    res.status(500).json({ success: false, message: 'Server problem' });
  }
};

const RegisterAdmin = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      password_confirmation,
      gender,
      phone,
      location,
    } = req.body;

    if (
      !fullName ||
      !email ||
      !password ||
      !password_confirmation ||
      !gender ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message: 'You must fill all fields',
        data: null,
      });
    }
    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please try again.',
        data: null,
      });
    }

    const ADMIN_QUOTA_LIMIT = parseInt(process.env.ADMIN_QUOTA_LIMIT) || 4;
    const adminCount = await Admin.countDocuments();
    if (adminCount >= ADMIN_QUOTA_LIMIT) {
      return res.status(403).json({
        success: false,
        message: 'Administrator quota is full.',
        data: null,
      });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'This email is already used', data: null });
    }
    const normalizedGender = normalizeGender(gender);
    const isFirstAdmin = adminCount === 0;
    const newUser = new Admin({
      fullName,
      email,
      password,
      gender: normalizedGender,
      phone,
      location,
      isSuperAdmin: isFirstAdmin, // 👑 The very first admin is the main boss
      // Super Admin is auto-approved; normal admins start as pending
      approvalStatus: isFirstAdmin ? 'approved' : 'pending',
      canDelete: isFirstAdmin ? true : false, // Super admin has all privileges
    });

    await newUser.save();

    try {
      await EmailVerification(req, newUser);
    } catch (err) {
      Logger.error('Could not send email:', err.message);
    }
    res.status(201).json({
      success: true,
      message: 'Admin account made! Please check your email to continue.',
      data: newUser,
    });

    // 🧹 Clear saved memory so the dashboard shows the new admin count
    cache.delete('stats');
  } catch (error) {
    Logger.error('Register Admin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const verifyEmailForAdmin = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) {
      return res.status(400).json({
        messsage: 'Code and email are required',
        success: false,
        data: null,
      });
    }
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'User not found',
        success: false,
        data: null,
      });
    }
    if (user.emailVerified) {
      return res.status(400).json({
        messsage: 'Email is already checked, please log in',
        success: false,
        data: null,
      });
    }
    const emailVerification = await Otp.findOne({
      userId: user._id,
      otpNumber: otp,
    });
    if (!emailVerification) {
      // send new code if wrong
      await EmailVerification(req, user);
      return res.status(400).json({
        message: 'Wrong code, we sent a new code to your email',
        success: false,
        data: null,
      });
    }
    if (new Date() > new Date(emailVerification.otpExpirationTime)) {
      await EmailVerification(req, user);
      return res.status(400).json({
        messsage: 'Code is too old, we sent a new code to your email',
        success: false,
        data: null,
      });
    }
    user.emailVerified = true;

    // ─── Set approval expiry for non-super admins ─────────────────────────
    // Give the super admin 24 hours to act. If they do nothing, a scheduled
    // job will auto-delete this admin account.
    if (!user.isSuperAdmin && user.approvalStatus === 'pending') {
      const APPROVAL_WINDOW_HOURS = parseInt(process.env.ADMIN_APPROVAL_WINDOW_HOURS) || 24;
      user.approvalExpiresAt = new Date(Date.now() + APPROVAL_WINDOW_HOURS * 60 * 60 * 1000);
    }

    await user.save();
    await Otp.deleteMany({ userId: user._id });

    // ─── Send "Pending Approval" email to non-super admins ───────────────
    if (!user.isSuperAdmin) {
      try {
        await sendEmail({
          to: user.email,
          subject: '✅ Email Verified — Awaiting Super Admin Approval',
          html: `
            <h2>Hello ${user.fullName},</h2>
            <p>Your email has been verified successfully! 🎉</p>
            <p>However, <strong>your admin account is now pending approval</strong> from the Super Admin.</p>
            <p>You will receive another email as soon as the Super Admin reviews your account.</p>
            <p><strong>Please do not try to log in yet</strong> — you will be notified by email once approved.</p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `,
        });
      } catch (emailErr) {
        Logger.error('Could not send pending approval email:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: user.isSuperAdmin
        ? 'Email verified successfully. You can now log in.'
        : 'Email verified! Your account is now pending Super Admin approval. You will be notified by email.',
      isPendingApproval: !user.isSuperAdmin,
    });
  } catch (err) {
    Logger.error('Email verification error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const AdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required',
        data: null,
      });
    }
    const user = await Admin.findOne({ email }).select('+password');
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: 'User not found', data: null });
    }

    // ✅ Check if this is the main boss
    const userObj = user.toObject();
    userObj.isSuperAdmin = user.isSuperAdmin === true;

    Logger.info('--- ADMIN LOGIN ATTEMPT ---');
    Logger.info('Email:', email);
    Logger.info('User ID:', userObj._id);
    Logger.info('Is Main Boss:', userObj.isSuperAdmin);
    Logger.info('---------------------------');

    if (!user.emailVerified) {
      return res.status(400).json({
        status: false,
        message: 'Please check your email first before logging in.',
        data: null,
      });
    }

    // ─── Approval Status Gate (only for normal admins) ────────────────────
    // NOTE: Admins created before this update have no approvalStatus.
    // We treat undefined/null as 'approved' for backward compatibility.
    if (!user.isSuperAdmin) {
      const status = user.approvalStatus || 'approved';
      if (status === 'pending') {
        return res.status(403).json({
          status: false,
          message: 'Your account is pending Super Admin approval. Please wait for an email notification before logging in.',
          approvalStatus: 'pending',
          data: null,
        });
      }
      if (status === 'rejected') {
        return res.status(403).json({
          status: false,
          message: 'Your admin account was rejected. Please contact the Super Admin.',
          approvalStatus: 'rejected',
          data: null,
        });
      }
    }

    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      return res
        .status(400)
        .json({ status: false, message: 'Wrong password', data: null });
    }
    // Use standardized login logic
    const result = performLogin(userObj, 'Admin', res);
    
    return res.status(200).json({
      ...result,
      message: 'Admin logged in',
    });

  } catch (err) {
    Logger.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: err.message,
      data: null,
    });
  }
};

const AdminPasswordResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({
        message: 'Email is required',
        success: false,
        data: null,
      });

    const user = await Admin.findOne({ email });
    if (!user)
      return res.status(404).json({
        message: 'User not found',
        success: false,
        data: null,
      });

    // Send password reset email
    await PasswordVerificationEmail(req, user);

    res.status(200).json({
      message: 'We sent a link to change your password to your email',
      success: true,
    });
  } catch (err) {
    Logger.error('Password link error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const AdminPasswordReset = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;
    const { id, token } = req.params;

    if (!password || !password_confirmation) {
      return res.status(400).json({
        message: 'Password and confirmation are required',
        success: false,
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        message: 'Passwords do not match',
        success: false,
      });
    }

    const user = await Admin.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ message: 'User not found', success: false });

    // Check if the link works
    try {
      jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);
    } catch (err) {
      return res
        .status(400)
        .json({ message: 'Code is wrong or too old', success: false });
    }

    // Change password
    user.password = password;
    await user.save();

    // Remove old password checks
    await PasswordVerifyModel.deleteMany({ userId: user._id });

    res
      .status(200)
      .json({ message: 'Password changed successfully', success: true });
  } catch (error) {
    Logger.error('Password reset error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;

    if (!password || !password_confirmation) {
      return res.status(400).json({
        message: 'Password and confirmation are required',
        success: false,
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        message: 'Passwords do not match',
        success: false,
      });
    }
    const userr = req.user;
    const user = await Admin.findById(req.user.id);
    if (!user)
      return res.status(401).json({ message: 'Not logged in', success: false });

    user.password = password; // set new password
    await user.save(); // save it

    // 🧹 Clear saved memory
    cache.delete(`admin_${req.user.id}`);

    res
      .status(200)
      .json({ message: 'Password changed successfully', success: true });
  } catch (error) {
    Logger.error('Password change error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const AdminLogout = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not logged in', success: false });
    }
    // Clear the login cookies
    clearTokensCookies(res);

    res.status(200).json({ message: 'Logged out successfully', success: true });
  } catch (error) {
    Logger.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const GetAdmin = (req, res) => {
  try {
    const user = req.user;
    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.isSuperAdmin = userObj.isSuperAdmin === true;

    return res.status(200).json({
      success: true,
      user: userObj,
      message: 'Got user details successfully',
    });
  } catch (error) {
    Logger.error('Get admin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const AdminDeleteOurSelf = async (req, res, next) => {
  try {
    const { id } = req.user;
    const deletedUser = await Admin.findByIdAndDelete(id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ message: 'Admin not found', success: false });
    }

    // ✅ Clear cookies so they log out right away
    clearTokensCookies(res);

    res.status(200).json({
      success: true,
      message: 'Admin account deleted successfully',
    });

    // 🧹 Clear saved memory
    cache.delete('stats');
    cache.delete(`admin_${id}`);
  } catch (error) {
    Logger.error('Admin delete error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const getAllDonorsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      gender,
      bloodGroup,
      location,
      name,
    } = req.query;

    // Search filters
    const query = {};

    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };

    const result = await Donor.paginate(query, options);

    res.status(200).json({
      success: true,
      donors: result.docs,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      currentPage: result.page,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      message: 'Got donors successfully',
    });
  } catch (error) {
    Logger.error('getAllDonorsForAdmin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const getSingleDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findById(id);

    Logger.info(`[AdminController] getSingleDonor - Got Donor: ${donor ? donor._id : 'NULL'}`);

    if (!donor)
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });

    res
      .status(200)
      .json({ success: true, donor, message: 'Got donor successfully' });
  } catch (error) {
    Logger.error('getSingleDonor error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const deleteSingleDonor = async (req, res) => {
  try {
    const { id } = req.params;

    // 🛡️ Privilege Check: Only super admin or admins with delete privilege can delete
    if (!req.user.isSuperAdmin && !req.user.canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete donors. Contact the Super Admin to grant delete privilege.',
      });
    }

    // Get donor first to find their email
    const donor = await Donor.findById(id);
    if (!donor) {
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });
    }

    const donorEmail = donor.email;
    const donorName = donor.fullName;

    await Donor.findByIdAndDelete(id);

    // 🧹 CLEAN UP: Delete everything about this person
    await DonorRequest.deleteMany({ donorId: id });

    await feedbackModel.deleteMany({ userId: id, userModel: 'Donor' });

    // 🔥 CLEAR ALL MEMORY: Stop old data from showing
    resetEntireCache();

    res
      .status(200)
      .json({ success: true, message: 'Donor deleted successfully' });

    // 📧 Send email to donor
    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: '🚫 Account Deleted by Boss',
        html: `
          <h2>Hello ${donorName},</h2>
          <p>Your donor account was <b>deleted</b> from our app by a boss.</p>
          <p>If this is a mistake, please contact our help team.</p>
          <p>You can make a new account anytime.</p>
          <br>
          <p>Thank you,<br>UnityDrop Team</p>
        `,
      });
    }

    // 🧹 Clear saved memory
    cache.delete('stats');

  } catch (error) {
    Logger.error('deleteSingleDonor error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const exportDonors = async (req, res) => {
  try {
    const { format = 'excel', bloodGroup, location, name, id } = req.query;

    // Search filters
    const query = {};
    if (id) query._id = id;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };

    const donors = await Donor.find(query).limit(5000).lean();

    if (!donors.length) {
      return res.status(404).json({ success: false, message: 'No donors found' });
    }

    if (format === 'excel') {
      const formatted = donors.map((d) => ({
        Name: d.fullName,
        'Blood Group': d.bloodGroup,
        Location: d.location,
        Address: d.address || '',
        Phone: d.phone || '',
        Email: d.email || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Donors');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename=donors_${Date.now()}.xlsx`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Disposition', `attachment; filename=donors_${Date.now()}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(20).text('UnityDrop: Donor List', { align: 'center', underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Made on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      // Print each donor
      donors.forEach((d, index) => {
        if (index > 0) doc.addPage();

        doc.fontSize(16).fillColor('#DC2626').text(`DONOR: ${d.fullName}`, { underline: true });
        doc.moveDown();

        doc.fontSize(12).fillColor('black');
        doc.text(`Blood Group: ${d.bloodGroup}`, { indent: 20 });
        doc.text(`Location: ${d.location}`, { indent: 20 });
        doc.text(`Email: ${d.email || 'None'}`, { indent: 20 });
        doc.text(`Phone: ${d.phone || 'None'}`, { indent: 20 });
        doc.text(`Email Checked: ${d.emailVerified ? 'YES' : 'NO'}`, { indent: 20 });
        doc.text(`Joined On: ${new Date(d.createdAt).toLocaleDateString()}`, { indent: 20 });

        doc.moveDown();
        doc.fontSize(12).text('Address:', { underline: true });
        doc.fontSize(10).text(d.address || 'No address given.', { width: 450 });

        doc.moveDown(2);
        doc.fontSize(8).text('--- End ---', { align: 'center', color: 'gray' });
      });

      doc.end();
    } else {
      res.status(400).json({ success: false, message: 'Wrong format. Use excel or pdf.' });
    }
  } catch (err) {
    Logger.error('exportDonors error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: err.message,
    });
  }
};

const getAllPatientsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      gender,
      bloodGroup,
      location,
      name,
      hospitalName,
    } = req.query;

    // Search filters
    const query = {};

    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (name) query.fullName = { $regex: new RegExp(name, 'i') };
    if (hospitalName)
      query.hospitalName = { $regex: new RegExp(hospitalName, 'i') };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      select: '-password', // ✅ Hide password
    };

    const result = await Patient.paginate(query, options);

    res.status(200).json({
      success: true,
      patients: result.docs,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      currentPage: result.page,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      message: 'Got patients successfully',
    });
  } catch (error) {
    Logger.error('getAllPatientsForAdmin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const getSinglePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).select('-password');

    Logger.info(`[AdminController] getSinglePatient - Got Patient: ${patient ? patient._id : 'NULL'}`);

    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });

    res.status(200).json({
      success: true,
      patient,
      message: 'Got patient successfully',
    });
  } catch (error) {
    Logger.error('getSinglePatient error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const deleteSinglePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // 🛡️ Privilege Check: Only super admin or admins with delete privilege can delete
    if (!req.user.isSuperAdmin && !req.user.canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete patients. Contact the Super Admin to grant delete privilege.',
      });
    }

    // Get patient first to find their email
    const patient = await Patient.findById(id);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    const patientEmail = patient.email;
    const patientName = patient.fullName;

    await Patient.findByIdAndDelete(id);

    // CLEAN UP: Delete everything about this person
    await DonorRequest.deleteMany({ patientId: id });

    await feedbackModel.deleteMany({ userId: id, userModel: 'Patient' });

    // CLEAR ALL MEMORY: Stop old data from showing
    resetEntireCache();

    res
      .status(200)
      .json({ success: true, message: 'Patient deleted successfully' });

    // 📧 Send email to patient
    if (patientEmail) {
      await sendEmail({
        to: patientEmail,
        subject: '🚫 Account Deleted by Boss',
        html: `
          <h2>Hello ${patientName},</h2>
          <p>Your patient account was <b>deleted</b> from our app by a boss.</p>
          <p>If this is a mistake, please contact our help team.</p>
          <p>You can make a new account anytime.</p>
          <br>
          <p>Thank you,<br>UnityDrop Team</p>
        `,
      });
    }

  } catch (error) {
    Logger.error('deleteSinglePatient error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const deleteSingleAdmin = async (req, res) => {
  try {
    // 🛡️ SECURITY: Only main boss can delete other bosses
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not Allowed: Only the main boss can delete other bosses.'
      });
    }

    const { id } = req.params;

    // Boss cannot delete themselves here
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete yourself here. Use "Delete Account" in your profile.' });
    }

    // Get admin first to find their email
    const admin = await Admin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const adminEmail = admin.email;
    const adminName = admin.fullName;

    await Admin.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: 'Admin deleted successfully' });

    // 📧 Send email to admin
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: '🚫 Admin Account Deleted by Main Boss',
        html: `
          <h2>Hello ${adminName},</h2>
          <p>Your admin account was <b>deleted</b> from the app by the main boss.</p>
          <p>If this is a mistake, please ask the main boss.</p>
          <p>You can make a new account anytime.</p>
          <br>
          <p>Thank you,<br>UnityDrop Team</p>
        `,
      });
    }



    // 🧹 Clear saved memory
    cache.delete(`admin_${id}`);

  } catch (error) {
    Logger.error('deleteSingleAdmin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    // 🛡️ SECURITY: Only main boss can see list of bosses
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not Allowed: Only main boss can see admin list'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      select: '-password',
    };

    const admins = await Admin.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const totalAdmins = await Admin.countDocuments();

    res.status(200).json({
      success: true,
      admins,
      totalPages: Math.ceil(totalAdmins / options.limit),
      currentPage: options.page,
      totalResults: totalAdmins
    });
  } catch (error) {
    Logger.error('getAllAdmins error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const exportPatients = async (req, res) => {
  try {
    const { format = 'excel', bloodGroup, location, name, id, hospitalName } = req.query;

    // Search filters
    const query = {};
    if (id) query._id = id;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (name) query.fullName = { $regex: new RegExp(name, 'i') };
    if (hospitalName)
      query.hospitalName = { $regex: new RegExp(hospitalName, 'i') };

    const patients = await Patient.find(query).select('-password').limit(5000).lean();

    if (!patients.length) {
      return res.status(404).json({ success: false, message: 'No patients found' });
    }

    if (format === 'excel') {
      const formatted = patients.map((p) => ({
        Name: p.fullName,
        Gender: p.gender,
        'Blood Group': p.bloodGroup,
        Location: p.location,
        Address: p.address || '',
        Phone: p.phone || '',
        Email: p.email || '',
        Hospital: p.hospitalName || 'None',
        'Hospital Address': p.hospitalAddress || 'None',
        'Hospital Location': p.hospitalLocation || 'None',
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=patients_${Date.now()}.xlsx`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Disposition', `attachment; filename=patients_${Date.now()}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(20).text('UnityDrop: Patient List', { align: 'center', underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Made on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      patients.forEach((p, index) => {
        if (index > 0) doc.addPage();

        doc.fontSize(16).fillColor('#DC2626').text(`PATIENT: ${p.fullName}`, { underline: true });
        doc.moveDown();

        doc.fontSize(12).fillColor('black');
        doc.text(`Blood Group: ${p.bloodGroup}`, { indent: 20 });
        doc.text(`Email: ${p.email || 'None'}`, { indent: 20 });
        doc.text(`Phone: ${p.phone || 'None'}`, { indent: 20 });
        doc.text(`Joined On: ${new Date(p.createdAt).toLocaleDateString()}`, { indent: 20 });

        doc.moveDown();
        doc.fontSize(12).text('Hospital Info:', { underline: true });
        doc.fontSize(11).text(`Hospital: ${p.hospitalName || 'None'}`, { indent: 20 });
        doc.text(`Hospital City: ${p.hospitalLocation || 'None'}`, { indent: 20 });
        doc.text(`Hospital Address: ${p.hospitalAddress || 'None'}`, { indent: 20 });

        doc.moveDown();
        doc.fontSize(12).text('Patient Address:', { underline: true });
        doc.fontSize(10).text(p.address || 'No address given.', { width: 450 });

        doc.moveDown(2);
        doc.fontSize(8).text('--- End ---', { align: 'center', color: 'gray' });
      });

      doc.end();
    } else {
      res.status(400).json({ success: false, message: 'Wrong format. Use excel or pdf.' });
    }
  } catch (err) {
    Logger.error('exportPatients error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: err.message,
    });
  }
};

const getStats = async (req, res) => {
  try {
    const [
      totalDonors,
      totalPatients,
      admins,
      donorBloodGroups,
      patientBloodGroups,
      requestStats,
    ] = await Promise.all([
      Donor.countDocuments(),
      Patient.countDocuments(),
      Admin.find({}, '_id isSuperAdmin').lean(),
      Donor.aggregate([
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { name: '$_id', value: '$count', _id: 0 } },
      ]),
      Patient.aggregate([
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { name: '$_id', value: '$count', _id: 0 } },
      ]),
      DonorRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { name: '$_id', value: '$count', _id: 0 } },
      ]),
    ]);

    // 👑 Check who is the main boss
    let totalSuperAdmins = admins.filter((a) => a.isSuperAdmin === true).length;
    let totalNormalAdmins = admins.length - totalSuperAdmins;

    // Fallback if no main boss is found
    if (totalSuperAdmins === 0 && admins.length > 0) {
      totalSuperAdmins = 1;
      totalNormalAdmins = admins.length - 1;
    }

    res.status(200).json({
      success: true,
      message: 'Got stats successfully',
      totalDonors,
      totalPatients,
      totalAdmins: totalNormalAdmins,
      totalSuperAdmins,
      totalSystemUsers: totalDonors + totalPatients + admins.length,
      donorBloodGroups,
      patientBloodGroups,
      requestStats,
    });
  } catch (error) {
    Logger.error('getStats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
    });
  }
};


const AdminUpdateProfile = async (req, res, next) => {
  try {
    const { body, user: currentUser } = req;

    // Only allow changing these fields
    let newUserData = {};
    const fields = [
      'fullName',
      'gender',
      'phone',
      'location',
    ];

    fields.forEach((field) => {
      if (typeof body[field] !== 'undefined') {
        let val = body[field];
        if (field === 'gender') val = normalizeGender(val);
        newUserData[field] = val;
      }
    });



    const updatedUser = await Admin.findByIdAndUpdate(
      currentUser.id,
      { $set: newUserData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const userObj = updatedUser.toObject();
    userObj.isSuperAdmin = userObj.isSuperAdmin === true;

    res.status(200).json({
      success: true,
      message: 'Admin Profile Updated',
      user: userObj,
    });

    // 🧹 Clear saved memory
    cache.delete(`admin_${currentUser.id}`);
  } catch (error) {
    Logger.error('Admin update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
      data: null,
    });
  }
};

const getAllFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await feedbackModel
      .find()
      .populate('userId', 'fullName email phone location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalFeedbacks = await feedbackModel.countDocuments();

    return res.status(200).json({
      success: true,
      message: feedbacks.length ? 'Got feedbacks successfully' : 'No feedbacks found',
      totalFeedbacks,
      totalPages: Math.ceil(totalFeedbacks / limit),
      currentPage: parseInt(page),
      feedbacks,
    });
  } catch (err) {
    Logger.error('❌ Get Feedbacks error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server problem getting feedbacks',
      error: err.message,
    });
  }
};

// Not used right now
const filterDonors = async (req, res) => {
  try {
    const { bloodGroup, location, page = 1, limit = 10 } = req.query;

    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = location;

    const donors = await Donor.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: donors.length, donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const filterPatients = async (req, res) => {
  try {
    const { bloodGroup, location, page = 1, limit = 10 } = req.query;

    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = location;

    const patients = await Patient.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: patients.length, patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const filterUsersCombined = async (req, res) => {
  try {
    const { bloodGroup, location } = req.query;

    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = location;

    // ✅ Find both at the same time for speed
    const [donors, patients] = await Promise.all([
      Donor.find(query).select('-password'),
      Patient.find(query).select('-password'),
    ]);

    res.status(200).json({
      success: true,
      donorsCount: donors.length,
      patientsCount: patients.length,
      donors,
      patients,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const filterUsers = async (req, res) => {
  try {
    const {
      type = 'all',
      bloodGroup,
      location,
      name,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };

    let donors = [],
      patients = [];
    let totalDonors = 0,
      totalPatients = 0;

    if (type === 'donor') {
      [donors, totalDonors] = await Promise.all([
        Donor.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Donor.countDocuments(query),
      ]);
    } else if (type === 'patient') {
      [patients, totalPatients] = await Promise.all([
        Patient.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Patient.countDocuments(query),
      ]);
    } else if (type === 'all') {
      const [donorResults, patientResults, donorCount, patientCount] =
        await Promise.all([
          Donor.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
          Patient.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
          Donor.countDocuments(query),
          Patient.countDocuments(query),
        ]);

      donors = donorResults;
      patients = patientResults;
      totalDonors = donorCount;
      totalPatients = patientCount;
    }

    // ✅ Show a simple message
    let message = '';
    if (type === 'donor') {
      message = totalDonors
        ? 'Found matching donors'
        : 'Did not find matching donors';
    } else if (type === 'patient') {
      message = totalPatients
        ? 'Found matching patients'
        : 'Did not find matching patients';
    } else {
      if (totalDonors || totalPatients) {
        message = 'Found matching donors or patients';
      } else {
        message = 'Did not find matching donors or patients';
      }
    }

    return res.status(200).json({
      success: true,
      message,
      filters: { type, bloodGroup, location, name },
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalPages: {
          donors: totalDonors ? Math.ceil(totalDonors / limitNum) : null,
          patients: totalPatients ? Math.ceil(totalPatients / limitNum) : null,
        },
      },
      donorsCount: totalDonors,
      patientsCount: totalPatients,
      donors,
      patients,
    });
  } catch (err) {
    Logger.error('❌ Filter error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * ─── UPDATE ADMIN APPROVAL STATUS (Super Admin only) ─────────────────────────
 * Super Admin visits an admin's profile and sets status to 'approved' or 'rejected'.
 *  - approved  → admin can now log in. Sends approval email.
 *  - rejected  → admin is permanently deleted from DB. Sends rejection email.
 */
const updateAdminApproval = async (req, res) => {
  try {
    // 🛡️ Only super admin can approve/reject
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the Super Admin can approve or reject admins.',
      });
    }

    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "approved" or "rejected".',
      });
    }

    // Cannot approve/reject yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own approval status.',
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    if (admin.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change approval status of the Super Admin.',
      });
    }

    const adminEmail = admin.email;
    const adminName = admin.fullName;

    if (approvalStatus === 'approved') {
      // ✅ Approve: allow them to work
      admin.approvalStatus = 'approved';
      admin.approvalExpiresAt = null; // Cancel the auto-delete timer
      await admin.save();

      // Clear cache
      cache.delete(`admin_${id}`);
      resetEntireCache();

      res.status(200).json({
        success: true,
        message: `Admin "${adminName}" has been approved successfully.`,
      });

      // 📧 Notify the approved admin
      try {
        await sendEmail({
          to: adminEmail,
          subject: '🎉 Admin Account Approved — You Can Now Log In!',
          html: `
            <h2>Hello ${adminName},</h2>
            <p>Great news! The Super Admin has <strong>approved</strong> your admin account on UnityDrop.</p>
            <p>You can now log in using your registered email and password:</p>
            <p><a href="${process.env.FRONTEND_URL}/admin/login" style="color:#DC2626;font-weight:bold;">Login to Admin Portal</a></p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `,
        });
      } catch (emailErr) {
        Logger.error('Could not send approval email:', emailErr.message);
      }

    } else {
      // ❌ Reject: permanently remove from DB
      await Admin.findByIdAndDelete(id);

      // Clear cache
      cache.delete(`admin_${id}`);
      resetEntireCache();

      res.status(200).json({
        success: true,
        message: `Admin "${adminName}" has been rejected and removed from the system.`,
      });

      // 📧 Notify the rejected admin
      try {
        await sendEmail({
          to: adminEmail,
          subject: '❌ Admin Account Rejected',
          html: `
            <h2>Hello ${adminName},</h2>
            <p>We regret to inform you that the Super Admin has <strong>rejected</strong> your admin account request on UnityDrop.</p>
            <p>Your account has been removed from our system.</p>
            <p>If you believe this is a mistake, please contact the Super Admin directly.</p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `,
        });
      } catch (emailErr) {
        Logger.error('Could not send rejection email:', emailErr.message);
      }
    }

  } catch (error) {
    Logger.error('updateAdminApproval error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
    });
  }
};

/**
 * ─── UPDATE ADMIN PRIVILEGES (Super Admin only) ───────────────────────────────
 * Super Admin can grant or remove the DELETE privilege for any normal admin.
 * By default admin can only READ (view). Super Admin can also grant canDelete.
 */
const updateAdminPrivileges = async (req, res) => {
  try {
    // 🛡️ Only super admin can change privileges
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the Super Admin can manage admin privileges.',
      });
    }

    const { id } = req.params;
    const { canDelete } = req.body;

    if (typeof canDelete !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'canDelete must be true or false.',
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own privileges here.',
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    if (admin.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change privileges of the Super Admin.',
      });
    }

    admin.canDelete = canDelete;
    await admin.save();

    // Clear cache
    cache.delete(`admin_${id}`);

    res.status(200).json({
      success: true,
      message: `Privileges updated: ${admin.fullName} can now ${canDelete ? 'view AND delete' : 'only view'} users.`,
      canDelete,
    });

  } catch (error) {
    Logger.error('updateAdminPrivileges error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: error.message,
    });
  }
};

// End of Controllers
export {
  RegisterAdmin,
  verifyEmailForAdmin,
  AdminLogin,
  AdminPasswordResetLink,
  AdminPasswordReset,
  changePassword,
  AdminLogout,
  GetAdmin,
  AdminDeleteOurSelf,
  getAllDonorsForAdmin,
  AdminUpdateProfile,
  filterDonors,
  filterPatients,
  filterUsersCombined,
  filterUsers,
  getAllFeedbacks,
  exportDonors,
  getSingleDonor,
  deleteSingleDonor,
  getAllPatientsForAdmin,
  getSinglePatient,
  deleteSinglePatient,
  deleteSingleAdmin,
  getAllAdmins,
  exportPatients,
  getStats,
  GetAdminStatus,
  updateAdminApproval,
  updateAdminPrivileges,
};