/** @format */

import Admin from '../models/admin.model.js';
import Otp from '../models/otp.model.js';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  generateTokens,
  setTokensCookies,
} from '../services/token/token.service.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import PasswordVerificationEmail from '../services/email/PasswordVerifyEmail.js';
import PasswordVerifyModel from '../models/PasswordVerify.model.js';
import Donor from '../models/donor.model.js';
import Patient from '../models/patient.model.js';
import BadRequest from '../models/badRequest.model.js';
import sendEmail from '../services/email/emailHelper.js';
import warningModel from '../models/warning.model.js';
import feedbackModel from '../models/feedback.model.js';
import crypto from 'crypto';
import superKeyModel from '../models/superKey.model.js';
import EmailVerification from '../services/email/EmailVerification.js';
export const generateSuperKey = async (req, res) => {
  try {
    const { superAdminId } = req.body;

    // Check if an active key exists
    let existingKey = await superKeyModel.findOne();

    if (existingKey && existingKey.expiresAt > new Date()) {
      return res.status(200).json({
        success: true,
        message: 'Existing Super Key is still valid',
        key: existingKey.key,
        expiresAt: existingKey.expiresAt,
      });
    }

    // Delete old key if expired
    if (existingKey) await superKeyModel.deleteMany({});

    // Generate new key
    const key = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const newKey = await superKeyModel.create({
      key,
      createdBy: superAdminId,
      expiresAt,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'New Super Key generated successfully',
      key: newKey.key,
      expiresAt: newKey.expiresAt,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
export const getSuperKey = async (req, res) => {
  try {
    // Find the active key
    const existingKey = await superKeyModel.findOne({});

    // No key found
    if (!existingKey) {
      return res.status(200).json({
        success: false,
        key: null,
        expiresAt: null,
        message: 'No active Super Key found yet Need to generate first',
      });
    }

    // Key expired
    if (existingKey.expiresAt < new Date()) {
      return res.status(200).json({
        success: false,
        key: existingKey.key,
        expiresAt: existingKey.expiresAt,
        message: 'Super Key has expired',
      });
    }

    // Key is valid
    res.status(200).json({
      success: true,
      key: existingKey.key,
      expiresAt: existingKey.expiresAt,
      message: 'Super Key fetched successfully',
    });
  } catch (err) {
    console.error('getSuperKey error:', err.message);
    res.status(500).json({
      success: false,
      key: null,
      expiresAt: null,
      message: 'Internal server error',
      error: err.message,
    });
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
      availabilityStatus,
      key,
    } = req.body;
    // console.log(
    //   'FullName',
    //   fullName,
    //   email,
    //   password,
    //   password_confirmation,
    //   gender,
    //   phone,
    //   availabilityStatus,
    //   key
    // );

    if (
      !fullName ||
      !email ||
      !password ||
      !password_confirmation ||
      !gender ||
      !phone ||
      !availabilityStatus ||
      !key
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        data: null,
      });
    }
    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message:
          'Maximum 3 admins allowed. Ask the app owner or a Super Admin to increase the limit.',
        data: null,
      });
    }
    // Max 3 admins check
    const adminCount = await Admin.countDocuments();
    if (adminCount >= 2) {
      return res.status(403).json({
        success: false,
        message:
          'Maximum 2 admins allowed. Ask the app owner or a Super Admin to increase the limit.',
        data: null,
      });
    }

    // Check if key is valid
    const validKey = await superKeyModel.findOne({ key, isActive: true });
    if (!validKey) {
      return res.status(400).json({
        success: false,
        message:
          'The Super Key is invalid. Please request the correct Super Key from the App Owner or a Super Admin.',
        data: null,
      });
    }
    if (validKey.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message:
          'This Super Key has expired. Please request a new key from the App Owner or a Super Admin.',
        data: null,
      });
    }
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already exists', data: null });
    }
    const newUser = new Admin({
      fullName,
      email,
      password,
      gender,
      phone,
      availabilityStatus,
    });
    await newUser.save();
    // console.log('newUser', newUser);
    // // ✅ 6. Mark key as used
    // adminKey.isUsed = true;
    // await adminKey.save();
    try {
      const otp = await EmailVerification(req, newUser);
      // console.log('OTP sent:', otp);
    } catch (err) {
      console.error('Failed to send verification email:', err.message);
    }
    res.status(201).json({
      success: true,
      message:
        'Admin Registration successful! Please verify your email to continue.',
      data: newUser,
    });
  } catch (error) {
    console.error('Register Admin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        messsage: 'OTP and email are required',
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
        messsage: 'Email already verified, please login',
        success: false,
        data: null,
      });
    }
    const emailVerification = await Otp.findOne({
      userId: user._id,
      otpNumber: otp,
    });
    if (!emailVerification) {
      // send new OTP if invalid
      await EmailVerification(req, user);
      return res.status(400).json({
        message: 'Invalid OTP, new OTP sent to your email',
        success: false,
        data: null,
      });
    }
    if (new Date() > new Date(emailVerification.otpExpirationTime)) {
      await EmailVerification(req, user);
      return res.status(400).json({
        messsage: 'OTP has expired, new OTP sent to your email',
        success: false,
        data: null,
      });
    }
    user.emailVerified = true;
    await user.save();
    await Otp.deleteMany({ userId: user._id });
    return res.status(200).json({
      status: 'success',
      message: 'Admin Email verified successfully',
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
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
    // console.log(user);
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: 'User not found', data: null });
    }
    if (!user.emailVerified) {
      return res.status(400).json({
        status: false,
        message: 'Please verify your email',
        data: null,
      });
    }
    const isMatchPassword = await bcrypt.compare(password, user.password);
    // console.log(isMatchPassword);
    if (!isMatchPassword) {
      return res
        .status(400)
        .json({ status: false, message: 'Incorrect password', data: null });
    }
    // Generate new tokens
    const { accessToken, accessTokenExp } = await generateTokens(user);

    setTokensCookies(res, { accessToken });
    // const is_auth = true;
    res.status(200).json({
      status: 'success',
      message: 'Admin Login successful',
      user,
      authCheck: {
        accessToken,
        accessTokenExp,
        // refreshToken,
        // refreshTokenExp,
        // is_auth,
      },
    });
  } catch (err) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
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
      message: 'Password reset link sent to your email',
    });
  } catch (err) {
    console.error('Password reset link error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const AdminPasswordReset = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;
    const { id, token } = req.params;
    // console.log(id, token);
    // console.log(process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);

    if (!password || !password_confirmation) {
      return res
        .status(400)
        .json({ message: 'Password and confirmation are required' });
    }

    if (password !== password_confirmation) {
      return res
        .status(400)
        .json({ message: 'Password and confirmation do not match' });
    }

    const user = await Admin.findById(id);
    // console.log(user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify the password reset token
    try {
      jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password (pre-save hook will hash it if defined)
    user.password = password;
    await user.save();

    // Remove any existing password verification records
    await PasswordVerifyModel.deleteMany({ userId: user._id });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Password reset error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const changePassword = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;

    if (!password || !password_confirmation) {
      return res
        .status(400)
        .json({ message: 'Password and confirmation are required' });
    }

    if (password !== password_confirmation) {
      return res
        .status(400)
        .json({ message: 'Password and confirmation do not match' });
    }
    const userr = req.user;
    // console.log('user sex', userr);
    const user = await Admin.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    user.password = password; // set new password
    await user.save(); // triggers pre('save') middleware

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const AdminLogout = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.clearCookie('accessToken');
    res.clearCookie('is_auth');
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const GetAdmin = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
      message: 'User fetched successfully',
    });
  } catch (error) {
    console.error('Get admin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const AdminDeleteOurSelf = async (req, res, next) => {
  try {
    const { id } = req.user;
    // console.log(id);
    const deletedUser = await Admin.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({
      status: 'success',
      message: 'Admin Account deleted successfully',
    });
  } catch (error) {
    console.error('Admin delete error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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

    // Build filters
    const query = {};

    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') }; // case-insensitive
    if (name) query.fullName = { $regex: new RegExp(name, 'i') }; // filter by name, case-insensitive

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
      message: 'Donors fetched successfully',
    });
  } catch (error) {
    console.error('getAllDonorsForAdmin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getSingleDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findById(id);

    if (!donor)
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });

    res
      .status(200)
      .json({ success: true, donor, message: 'Donor fetched successfully' });
  } catch (error) {
    console.error('getSingleDonor error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const deleteSingleDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findByIdAndDelete(id);

    if (!donor)
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });

    res
      .status(200)
      .json({ success: true, message: 'Donor deleted successfully' });
  } catch (error) {
    console.error('deleteSingleDonor error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const exportDonors = async (req, res) => {
  try {
    const { format = 'excel', bloodGroup, location } = req.query;

    // Build filters
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };

    const donors = await Donor.find(query).lean();

    if (!donors.length) {
      return res.status(404).json({ message: 'No donors found' });
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
      res.setHeader('Content-Disposition', 'attachment; filename=donors.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=donors.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(16).text('Donors List', { align: 'center' });
      doc.moveDown();

      // Print each donor simply, line by line
      donors.forEach((d) => {
        doc
          .fontSize(12)
          .text(
            `Name: ${d.fullName}\nBlood Group: ${d.bloodGroup}\nLocation: ${
              d.location
            }\nAddress: ${d.address || ''}\nPhone: ${d.phone || ''}\nEmail: ${
              d.email || ''
            }\n\n`
          );
      });

      doc.end();
    } else {
      res.status(400).json({ message: 'Invalid format. Use excel or pdf.' });
    }
  } catch (err) {
    console.error('exportDonors error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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

    // Build filters
    const query = {};

    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };
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
      message: 'Patients fetched successfully',
    });
  } catch (error) {
    console.error('getAllPatientsForAdmin error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getSinglePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).select('-password');

    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });

    res.status(200).json({
      success: true,
      patient,
      message: 'Patient fetched successfully',
    });
  } catch (error) {
    console.error('getSinglePatient error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const deleteSinglePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findByIdAndDelete(id);

    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });

    res
      .status(200)
      .json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('deleteSinglePatient error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const exportPatients = async (req, res) => {
  try {
    const { format = 'excel', bloodGroup, location, hospitalName } = req.query;

    // Build filters
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (hospitalName)
      query.hospitalName = { $regex: new RegExp(hospitalName, 'i') };

    const patients = await Patient.find(query).select('-password').lean();

    if (!patients.length) {
      return res.status(404).json({ message: 'No patients found' });
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
        Hospital: p.hospitalName,
        'Hospital Address': p.hospitalAddress,
        'Hospital Location': p.hospitalLocation,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=patients.xlsx'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=patients.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(16).text('Patients List', { align: 'center' });
      doc.moveDown();

      patients.forEach((p) => {
        doc
          .fontSize(12)
          .text(
            `Name: ${p.fullName}\nGender: ${p.gender}\nBlood Group: ${
              p.bloodGroup
            }\nLocation: ${p.location}\nAddress: ${p.address || ''}\nPhone: ${
              p.phone || ''
            }\nEmail: ${p.email || ''}\nHospital: ${
              p.hospitalName
            }\nHospital Address: ${p.hospitalAddress}\nHospital Location: ${
              p.hospitalLocation
            }\n\n`
          );
      });

      doc.end();
    } else {
      res.status(400).json({ message: 'Invalid format. Use excel or pdf.' });
    }
  } catch (err) {
    console.error('exportPatients error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const getStats = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const totalPatients = await Patient.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      totalDonors,
      totalPatients,
    });
  } catch (error) {
    console.error('getStats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const AdminUpdateProfile = async (req, res, next) => {
  try {
    const { body, user: currentUser } = req;

    // Prepare allowed fields only
    let newUserData = {};

    if (body.fullName) newUserData.fullName = body.fullName;
    if (body.gender) newUserData.gender = body.gender;
    if (body.phone) newUserData.phone = body.phone;
    if (typeof body.availabilityStatus !== 'undefined')
      newUserData.availabilityStatus = body.availabilityStatus;

    const updatedUser = await Admin.findByIdAndUpdate(
      currentUser.id,
      newUserData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Admin Profile Updated Successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getAllBadRequests = async (req, res) => {
  try {
    const badRequests = await BadRequest.find({ status: 'Pending' })
      .populate('donorId', 'fullName email')
      .populate('patientId', 'fullName email');

    res.status(200).json({
      success: true,
      badRequests,
      message: 'Bad requests fetched successfully',
    });
  } catch (error) {
    console.error('getAllBadRequests error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const createWarning = async (
  donorId,
  patientId,
  action,
  message,
  adminId,
  adminName
) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return await warningModel.create({
    donorId,
    patientId,
    action,
    message,
    createdBy: adminId,
    whoGivedWarning: adminName,
    expiresAt,
  });
};
const resolveBadRequest = async (req, res) => {
  try {
    const { id: adminId, fullName: adminName } = req.user; // assume auth middleware attaches admin
    const { badRequestId, action } = req.body; // Forgive | Ignore | Ban

    const badRequest = await BadRequest.findById(badRequestId).populate(
      'donorId',
      'fullName email'
    );
    if (!badRequest)
      return res.status(404).json({ message: 'Bad request not found' });

    const donor = badRequest.donorId;
    const patient = badRequest.patientId;
    if (!donor?.email) {
      return res.status(400).json({ message: 'Donor email not found' });
    }

    if (action === 'Forgive') {
      badRequest.status = 'Acknowledged';
      await badRequest.save();

      // Send Forgive email
      await sendEmail({
        to: donor.email,
        subject: '⚠️ Admin Warning - Last Chance',
        html: `
          <h2>Hello ${donor.fullName},</h2>
          <p>The admin has reviewed your behaviour and decided to <b>forgive you</b> this time.</p>
          <p>⚠️ But this is your <b>last warning</b>. If you continue rejecting patients irresponsibly, your account may be banned.</p>
          <p>Please cooperate and be responsible.</p>
        `,
      });
      await createWarning(
        donor._id,
        patient._id,
        'Forgive',
        'Admin forgave your rejection case but gave you a last warning and Please cooperate and Check Your Email.',
        adminId,
        adminName
      );
    } else if (action === 'Ignore') {
      await badRequest.deleteOne();

      // Send Ignore email
      await sendEmail({
        to: donor.email,
        subject: '⚠️ Admin Notice - Please Be Serious',
        html: `
          <h2>Hello ${donor.fullName},</h2>
          <p>Your recent rejection case has been <b>ignored</b> by the admin.</p>
          <p>But please, <b>do not repeat this behaviour</b>. Be serious and responsible towards patient requests.</p>
        `,
      });
      await createWarning(
        donor._id,
        patient._id,
        'Ignore',
        'Admin ignored your rejection but asked you to be responsible and Check Your Email.',
        adminId,
        adminName
      );
    } else if (action === 'Ban') {
      // Delete donor + bad request
      await Donor.findByIdAndDelete(badRequest.donorId);
      await badRequest.deleteOne();

      // Send Ban email
      await sendEmail({
        to: donor.email,
        subject: '🚫 Account Removed by Admin',
        html: `
          <h2>Hello ${donor.fullName},</h2>
          <p>After multiple warnings, the admin has <b>removed your donor account</b> due to repeated rejections.</p>
          <p>You are no longer part of the donor system.</p>
        `,
      });
      await createWarning(
        donor._id,
        patient._id,
        'Ban',
        'Your account has been banned due to repeated rejections and Check Your Email.',
        adminId,
        adminName
      );
    }

    res.status(200).json({ success: true, message: 'Action completed' });
  } catch (error) {
    console.error('resolveBadRequest error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
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

    // ✅ Run queries in parallel for speed
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

    // ✅ Message logic
    let message = '';
    if (type === 'donor') {
      message = totalDonors
        ? 'Matching donors found'
        : 'No matching donors found';
    } else if (type === 'patient') {
      message = totalPatients
        ? 'Matching patients found'
        : 'No matching patients found';
    } else {
      if (totalDonors || totalPatients) {
        message = 'Matching donors and/or patients found';
      } else {
        message = 'No matching donors or patients found';
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
    console.error('❌ Filter error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await feedbackModel
      .find()
      .populate('userId', 'fullName email') // only required fields
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: feedbacks.length
        ? 'Feedbacks fetched successfully'
        : 'No feedbacks found',
      totalFeedbacks: feedbacks.length,
      feedbacks,
    });
  } catch (err) {
    console.error('❌ Get Feedbacks error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching feedbacks',
      error: err.message,
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
  getAllBadRequests,
  resolveBadRequest,
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
  exportPatients,
  getStats,
};
