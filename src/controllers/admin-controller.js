import Logger from '../utils/logger.js';
import Admin from '../models/admin-model.js';
import Otp from '../models/otp-model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { performLogin, performLogoutCleanup } from '../services/auth-utilities.js';
import PasswordVerificationEmail from '../services/email/password-verify-email.js';
import PasswordVerifyModel from '../models/password-verify-model.js';
import Donor from '../models/donor-model.js';
import Patient from '../models/patient-model.js';
import sendEmail from '../services/email/email-helper.js';
import DonorRequest from '../models/donor-request-model.js';
import feedbackModel from '../models/feedback-model.js';
import EmailVerification from '../services/email/email-verification.js';
import { normalizeGender } from '../utils/blood-helpers.js';
import { resetEntireCache } from '../cache/utils.js';
const GetAdminStatus = async (req, res) => {
  try {
    const ADMIN_QUOTA_LIMIT = parseInt(process.env.ADMIN_QUOTA_LIMIT);
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
    const ADMIN_QUOTA_LIMIT = parseInt(process.env.ADMIN_QUOTA_LIMIT);
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
      if (!existingUser.emailVerified) {
        EmailVerification(req, existingUser).catch((err) =>
          Logger.error('Could not resend email:', err.message)
        );
        return res.status(200).json({
          success: true,
          message: 'Account already created! A new OTP has been sent to your email.',
          data: existingUser,
        });
      }
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
      isSuperAdmin: isFirstAdmin,
      approvalStatus: isFirstAdmin ? 'approved' : 'pending',
      canDelete: isFirstAdmin ? true : false,
    });
    await newUser.save();
    EmailVerification(req, newUser).catch((err) =>
      Logger.error('Could not send email:', err.message)
    );
    return res.status(201).json({
      success: true,
      message: 'Admin account made! Please check your email to continue.',
      data: newUser,
    });
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
        message: 'Code and email are required',
        error: 'Code and email are required',
        success: false,
        data: null,
      });
    }
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'User not found',
        error: 'User not found',
        success: false,
        data: null,
      });
    }
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email is already verified, please log in',
        error: 'Email is already verified, please log in',
        success: false,
        data: null,
      });
    }
    const emailVerification = await Otp.findOne({
      userId: user._id,
      otpNumber: otp,
    });
    if (!emailVerification) {
      await EmailVerification(req, user);
      return res.status(400).json({
        message: 'Wrong code, we sent a new code to your email',
        error: 'Wrong code, we sent a new code to your email',
        success: false,
        data: null,
      });
    }
    if (new Date() > new Date(emailVerification.otpExpirationTime)) {
      await EmailVerification(req, user);
      return res.status(400).json({
        message: 'Code is too old, we sent a new code to your email',
        error: 'Code is too old, we sent a new code to your email',
        success: false,
        data: null,
      });
    }
    user.emailVerified = true;
    await user.save();
    await Otp.deleteMany({ userId: user._id });
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
      error: err.message,
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
    const userObj = user.toObject();
    userObj.isSuperAdmin = user.isSuperAdmin === true;
    // Logger.info('Email:', email);
    // Logger.info('User ID:', userObj._id);
    // Logger.info('Is Main Boss:', userObj.isSuperAdmin);
    if (!user.emailVerified) {
      return res.status(400).json({
        status: false,
        message: 'Please check your email first before logging in.',
        data: null,
      });
    }
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
    await PasswordVerificationEmail(req, user);
    res.status(200).json({
      message: 'We sent a link to change your password to your email',
      success: true,
    });
  } catch (err) {
    Logger.error('Password link error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server problem',
      error: err.message,
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

    try {
      jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);
    } catch (err) {
      Logger.error('JWT verification failed:', err.message);
      return res
        .status(400)
        .json({ message: 'Reset link is invalid or has expired', success: false });
    }
    // Change password
    user.password = password;
    await user.save();
    // Remove old password
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
    const user = await Admin.findById(req.user.id);
    if (!user)
      return res.status(401).json({ message: 'Not logged in', success: false });
    user.password = password; // set new password
    await user.save();
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
    const result = performLogoutCleanup(res, 'Admin');
    res.status(200).json(result);
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
    const result = performLogoutCleanup(res, 'Admin', 'Admin account deleted successfully');
    res.status(200).json(result);
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
    const query = {};
    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      select: '-password', // Hide password
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
    Logger.info(`Got Donor: ${donor ? donor._id : 'NULL'}`);
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
    // Privilege Check: Only super admin or admins with delete privilege can delete
    if (!req.user.isSuperAdmin && !req.user.canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete donors. Contact the Super Admin to grant delete privilege.',
      });
    }
    const donor = await Donor.findById(id);
    if (!donor) {
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });
    }
    const donorEmail = donor.email;
    const donorName = donor.fullName;
    await Donor.findByIdAndDelete(id);
    // Delete everything about this person
    await DonorRequest.deleteMany({ donorId: id });
    await feedbackModel.deleteMany({ userId: id, userModel: 'Donor' });
    // CLEAR ALL MEMORY
    resetEntireCache();
    res
      .status(200)
      .json({ success: true, message: 'Donor deleted successfully' });
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
      select: '-password', // Hide password
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
    Logger.info(`Got Patient: ${patient ? patient._id : 'NULL'}`);
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
    // Only super admin or admins with delete privilege can delete
    if (!req.user.isSuperAdmin && !req.user.canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete patients. Contact the Super Admin to grant delete privilege.',
      });
    }
    const patient = await Patient.findById(id);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }
    const patientEmail = patient.email;
    const patientName = patient.fullName;
    await Patient.findByIdAndDelete(id);
    // Delete everything about this person
    await DonorRequest.deleteMany({ patientId: id });
    await feedbackModel.deleteMany({ userId: id, userModel: 'Patient' });
    // CLEAR ALL MEMORY
    resetEntireCache();
    res
      .status(200)
      .json({ success: true, message: 'Patient deleted successfully' });
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
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not Allowed: Only the main boss can delete other bosses.'
      });
    }
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete yourself here. Use "Delete Account" in your profile.' });
    }
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
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not Allowed: Only main boss can see admin list'
      });
    }
    const {
      page = 1,
      limit = 10,
      name,
      gender,
      approvalStatus,
      role
    } = req.query;

    const query = {};
    if (name) query.fullName = { $regex: new RegExp(name, 'i') };
    if (gender) query.gender = gender;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (role === 'superadmin') query.isSuperAdmin = true;
    if (role === 'admin') query.isSuperAdmin = false;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      select: '-password',
    };
    const admins = await Admin.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const totalAdmins = await Admin.countDocuments(query);
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
const getStats = async (req, res) => {
  try {
    const [
      totalDonors,
      totalPatients,
      admins,
    ] = await Promise.all([
      Donor.countDocuments(),
      Patient.countDocuments(),
      Admin.find({}, '_id isSuperAdmin').lean(),
    ]);

    let totalSuperAdmins = admins.filter((a) => a.isSuperAdmin === true).length;
    let totalNormalAdmins = admins.length - totalSuperAdmins;
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
    Logger.error('Get Feedbacks error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server problem getting feedbacks',
      error: err.message,
    });
  }
};
const filterUsers = async (req, res) => {
  try {
    const {
      type = 'all', // 'donor', 'patient', 'admin', 'all'
      bloodGroup,
      location,
      name,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    // Search (for text-based search)
    const searchQuery = {};
    if (location) searchQuery.location = { $regex: location, $options: 'i' };
    if (name) searchQuery.fullName = { $regex: name, $options: 'i' };
    // Blood group filter
    const medicalQuery = { ...searchQuery };
    if (bloodGroup) medicalQuery.bloodGroup = bloodGroup;
    let donors = [],
      patients = [],
      admins = [];
    let totalDonors = 0,
      totalPatients = 0,
      totalAdmins = 0;
    const tasks = [];
    if (type === 'donor' || type === 'all') {
      tasks.push(
        Donor.find(medicalQuery)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Donor.countDocuments(medicalQuery)
      );
    }
    if (type === 'patient' || type === 'all') {
      tasks.push(
        Patient.find(medicalQuery)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Patient.countDocuments(medicalQuery)
      );
    }
    if (type === 'admin' || (type === 'all' && !bloodGroup)) {
      tasks.push(
        Admin.find(searchQuery)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Admin.countDocuments(searchQuery)
      );
    }
    const results = await Promise.all(tasks);
    let resultIndex = 0;
    if (type === 'donor' || type === 'all') {
      donors = results[resultIndex++];
      totalDonors = results[resultIndex++];
    }
    if (type === 'patient' || type === 'all') {
      patients = results[resultIndex++];
      totalPatients = results[resultIndex++];
    }
    if (type === 'admin' || (type === 'all' && !bloodGroup)) {
      admins = results[resultIndex++];
      totalAdmins = results[resultIndex++];
    }
    const hasResults = totalDonors > 0 || totalPatients > 0 || totalAdmins > 0;
    const message = hasResults
      ? 'Found matching users'
      : 'No users match your search criteria';

    return res.status(200).json({
      success: true,
      message,
      filters: { type, bloodGroup, location, name },
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalPages: {
          donors: Math.ceil(totalDonors / limitNum),
          patients: Math.ceil(totalPatients / limitNum),
          admins: Math.ceil(totalAdmins / limitNum),
        },
      },
      counts: {
        donors: totalDonors,
        patients: totalPatients,
        admins: totalAdmins,
        total: totalDonors + totalPatients + totalAdmins,
      },
      donors,
      patients,
      admins,
    });
  } catch (err) {
    Logger.error('filterUsers Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: err.message,
    });
  }
};
const updateAdminApproval = async (req, res) => {
  try {
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
      admin.approvalStatus = 'approved';
      await admin.save();
      res.status(200).json({
        success: true,
        message: `Admin "${adminName}" has been approved successfully.`,
      });
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
      await Admin.findByIdAndDelete(id);
      // Clear cache
      resetEntireCache();
      res.status(200).json({
        success: true,
        message: `Admin "${adminName}" has been rejected and removed from the system.`,
      });
      // Notify the rejected admin
      try {
        await sendEmail({
          to: adminEmail,
          subject: ' Admin Account Rejected',
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
const updateAdminPrivileges = async (req, res) => {
  try {
    //Only super admin can change privileges
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
  filterUsers,
  getAllFeedbacks,
  getSingleDonor,
  deleteSingleDonor,
  getAllPatientsForAdmin,
  getSinglePatient,
  deleteSinglePatient,
  deleteSingleAdmin,
  getAllAdmins,
  getStats,
  GetAdminStatus,
  updateAdminApproval,
  updateAdminPrivileges,
};