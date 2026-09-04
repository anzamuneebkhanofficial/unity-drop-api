import Logger from '../utils/logger.js';
import Patient from '../models/patient-model.js';
import Otp from '../models/otp-model.js';
import config from '../config/env.js';
import bcrypt from 'bcryptjs';
import { performLogin, performLogoutCleanup } from '../services/auth-utilities.js';
import jwt from 'jsonwebtoken';
import PasswordVerificationEmail from '../services/email/password-verify-email.js';
import Donor from '../models/donor-model.js';
import feedbackModel from '../models/feedback-model.js';
import { normalizeBloodGroup, normalizeGender, VALID_BLOOD_GROUPS } from '../utils/blood-helpers.js';
import DonorRequest from '../models/donor-request-model.js';
import PasswordVerifyModel from '../models/password-verify-model.js';
import EmailVerification from '../services/email/email-verification.js';
import sendEmail from '../services/email/email-helper.js';
const RegisterPatient = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      password_confirmation,
      gender,
      bloodGroup: rawBloodGroup,
      location,
      address,
      phone,
      hospitalName,
      hospitalAddress,
      hospitalLocation,
      availabilityStatus,
    } = req.body;
    let bloodGroup = normalizeBloodGroup(rawBloodGroup);
    let genderNormalized = normalizeGender(gender);
    if (
      !fullName ||
      !email ||
      !password ||
      !password_confirmation ||
      !gender ||
      !bloodGroup ||
      !location ||
      !phone
    ) {
      return res.status(400).json({
        message: 'All required fields must be filled',
        success: false,
        data: null,
      });
    }
    if (password !== password_confirmation) {
      return res.status(400).json({
        message: 'Password and confirm password do not match',
        success: false,
        data: null,
      });
    }
    const existingUser = await Patient.findOne({ email });
    if (existingUser) {
      if (!existingUser.emailVerified) {
        EmailVerification(req, existingUser).catch((err) =>
          Logger.error(`Could not resend email: ${err.message || err}`)
        );
        return res.status(200).json({
          message: 'Account already created! A new OTP has been sent to your email.',
          success: true,
          patient: existingUser,
        });
      }
      return res.status(409).json({
        message: 'Email already exists',
        success: false,
        data: null,
      });
    }

    const existingPhone = await Patient.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        message: 'Phone number already exists',
        success: false,
        data: null,
      });
    }

    const newPatient = new Patient({
      fullName,
      email,
      password,
      gender: genderNormalized,
      bloodGroup,
      location,
      address,
      phone,
      hospitalName,
      hospitalAddress,
      hospitalLocation,
      availabilityStatus: availabilityStatus || false,
    });
    await newPatient.save();
    EmailVerification(req, newPatient).catch((err) =>
      Logger.error(`Failed to send verification email: ${err.message || err}`)
    );
    return res.status(201).json({
      message:
        'Patient Registration successful! Please verify your email to activate your account.',
      success: true,
      patient: newPatient,
    });
  } catch (error) {
    if (error.code === 11000) {
      const isPhone = error.keyPattern && error.keyPattern.phone;
      return res.status(409).json({
        success: false,
        message: isPhone ? 'Phone number already exists' : 'Email already exists',
        data: null,
      });
    }
    Logger.error('Register Patient error:', error.message);
    res.status(500).json({ error: error.message, success: false });
  }
};
const verifyEmailForPatient = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) {
      return res.status(400).json({ message: 'OTP and email are required', error: 'OTP and email are required' });
    }
    const user = await Patient.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found', error: 'User not found' });
    }
    if (user.emailVerified) {
      return res
        .status(400)
        .json({ message: 'Email already verified, please login', error: 'Email already verified, please login' });
    }
    const emailVerification = await Otp.findOne({
      userId: user._id,
      otpNumber: otp,
    });
    if (!emailVerification) {
      return res
        .status(400)
        .json({ message: 'Invalid OTP. Please check your verification code and try again.', error: 'Invalid OTP. Please check your verification code and try again.' });
    }
    if (new Date() > new Date(emailVerification.otpExpirationTime)) {
      await EmailVerification(req, user);
      return res
        .status(400)
        .json({ message: 'OTP has expired, new OTP sent to your email', error: 'OTP has expired, new OTP sent to your email' });
    }
    user.emailVerified = true;
    await user.save();
    await Otp.deleteMany({ userId: user._id });
    return res.status(200).json({
      status: 'success',
      message: 'Patient Email verified successfully',
    });
  } catch (err) {
    Logger.error('Email verification error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
const PatientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: 'Email and password are required' });
    }
    const user = await Patient.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ status: false, message: 'User not found' });
    }
    if (!user.emailVerified) {
      return res
        .status(400)
        .json({ status: false, message: 'Please verify your email' });
    }
    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      return res
        .status(400)
        .json({ status: false, message: 'Incorrect password' });
    }
    const result = performLogin(user, 'Patient', res);
    return res.status(200).json(result);
  } catch (err) {
    Logger.error('Patient Login error:', err.message);
    res.status(500).json({ status: false, error: err.message });
  }
};
const PatientPasswordResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await Patient.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await PasswordVerificationEmail(req, user);
    res.status(200).json({
      message: 'Password reset link sent to your email',
    });
  } catch (err) {
    Logger.error('Password reset link error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const PatientPasswordReset = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;
    const { id, token } = req.params;
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
    const user = await Patient.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    try {
      jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    user.password = password;
    await user.save();
    await PasswordVerifyModel.deleteMany({ userId: user._id });
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    Logger.error('Password reset error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const changePatientPassword = async (req, res) => {
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
    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    user.password = password;
    await user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    Logger.error('Password change error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const PatientLogout = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const result = performLogoutCleanup(res, 'Patient');
    res.status(200).json(result);
  } catch (err) {
    Logger.error('Logout error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const PatientDeleteOurSelf = async (req, res) => {
  try {
    const { id } = req.user;
    // clear all data of this patient
    await Patient.findByIdAndDelete(id);
    await DonorRequest.deleteMany({ patientId: id });
    await feedbackModel.deleteMany({ userId: id, userModel: 'Patient' });
    // clear all cache
    const result = performLogoutCleanup(res, 'Patient', 'Patient account deleted successfully');
    res.status(200).json(result);
  } catch (err) {
    Logger.error('Patient delete error:', err.message);
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
    const patientId = req.user._id;
    const [totalDonors, pendingMyRequests, totalDonationsReceived] = await Promise.all([
      Donor.countDocuments({}),
      DonorRequest.countDocuments({ patientId, status: 'Pending' }),
      DonorRequest.countDocuments({ patientId, status: 'Approved' }),
    ]);
    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      totalDonors,
      pendingMyRequests,
      totalDonationsReceived,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const PatientUpdateProfile = async (req, res, next) => {
  try {
    const { body, user: currentUser } = req;
    let newUserData = {};
    const fields = [
      'fullName',
      'gender',
      'phone',
      'location',
      'latitude',
      'longitude',
      'address',
      'bloodGroup',
      'hospitalName',
      'hospitalAddress',
      'hospitalLocation',
      'availabilityStatus',
    ];
    for (const field of fields) {
      if (typeof body[field] !== 'undefined') {
        let val = body[field];
        if (field === 'bloodGroup') val = normalizeBloodGroup(val);
        if (field === 'gender') val = normalizeGender(val);
        newUserData[field] = val;
      }
    }

    if (newUserData.phone) {
      const existingPhone = await Patient.findOne({
        phone: newUserData.phone,
        _id: { $ne: currentUser.id },
      });
      if (existingPhone) {
        return res.status(409).json({
          message: 'Phone number already exists',
          success: false,
        });
      }
    }

    if (newUserData.bloodGroup && !VALID_BLOOD_GROUPS.includes(newUserData.bloodGroup)) {
      return res.status(400).json({ success: false, message: `Invalid blood group: ${newUserData.bloodGroup}` });
    }
    const updatedUser = await Patient.findByIdAndUpdate(
      currentUser.id,
      { $set: newUserData },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Patient Profile Updated Successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already exists',
      });
    }
    Logger.error('Patient update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const GetPatient = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
      message: 'Patient fetched successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
const getAllDonorsForPatient = async (req, res) => {
  try {
    const { page = 1, limit = 10, name, bloodGroup, location } = req.query;
    const query = {};
    query.emailVerified = true;
    if (name) query.fullName = { $regex: name, $options: 'i' };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    let result;
    if (name || bloodGroup || location) {
      const donors = await Donor.find(query)
        .sort({ createdAt: -1 })
        .select('fullName email gender bloodGroup location availabilityStatus')
        .lean();
      result = {
        docs: donors,
        totalDocs: donors.length,
        totalPages: 1,
        page: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    } else {
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        select: 'fullName email gender bloodGroup location availabilityStatus',
        lean: true,
      };
      result = await Donor.paginate(query, options);
    }
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
    Logger.error('Donor Failded:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getDonorByIdForPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;
    const approvedRequest = await DonorRequest.findOne({
      patientId,
      donorId: id,
      status: 'Approved',
    }).lean();
    const requestStatus = await DonorRequest.findOne({
      patientId,
      donorId: id,
    }).sort({ createdAt: -1 }).lean();
    let donor;
    if (approvedRequest) {
      donor = await Donor.findById(id).select('-password').lean();
    } else {
      donor = await Donor.findById(id).select(
        'fullName email gender bloodGroup location phone availabilityStatus createdAt updatedAt'
      ).lean();
    }
    Logger.info(`[PatientController] getDonorByIdForPatient - Fetched Donor: ${donor ? donor._id : 'NULL'}`);
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
      });
    }
    res.status(200).json({
      success: true,
      donor,
      status: requestStatus?.status || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
const sendBloodRequestToDonor = async (req, res) => {
  try {
    const { donorId } = req.params;
    const {
      message,
      patientAge,
      bottlesRequired,
      hospitalName,
      city,
      pickAndDrop,
      exchangePossibility,
      caseDescription,
      attendantName,
      attendantPhone
    } = req.body;
    const patientId = req.user.id;
    if (!donorId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Donor ID and message are required',
      });
    }

    if (patientAge !== undefined && patientAge !== null && patientAge !== '') {
      const parsedAge = Number(patientAge);
      if (isNaN(parsedAge) || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).json({
          success: false,
          message: 'Patient age must be an integer between 1 and 120',
        });
      }
    }

    if (bottlesRequired !== undefined && bottlesRequired !== null && bottlesRequired !== '') {
      const parsedBottles = Number(bottlesRequired);
      if (isNaN(parsedBottles) || !Number.isInteger(parsedBottles) || parsedBottles < 1 || parsedBottles > 20) {
        return res.status(400).json({
          success: false,
          message: 'Bottles required must be an integer between 1 and 20',
        });
      }
    }

    if (attendantPhone !== undefined && attendantPhone !== null && attendantPhone !== '') {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(String(attendantPhone).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Attendant phone must contain between 10 and 15 digits only',
        });
      }
    }

    if (attendantName !== undefined && attendantName !== null && attendantName !== '') {
      const nameRegex = /^[a-zA-Z\s]{2,50}$/;
      if (!nameRegex.test(String(attendantName).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Attendant name must contain only alphabets and spaces (2 to 50 characters)',
        });
      }
    }
    const sanitizedAge = (patientAge !== undefined && patientAge !== null && patientAge !== '') ? Number(patientAge) : undefined;
    const sanitizedBottles = (bottlesRequired !== undefined && bottlesRequired !== null && bottlesRequired !== '') ? String(bottlesRequired) : undefined;
    const sanitizedName = attendantName ? String(attendantName).trim() : undefined;
    const sanitizedPhone = attendantPhone ? String(attendantPhone).trim() : undefined;

    const existingRequest = await DonorRequest.findOne({ donorId, patientId });
    if (existingRequest) {
      if (existingRequest.status === 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Request already pending. Please wait for donor response.',
        });
      }
      if (existingRequest.status === 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Request already approved. You cannot send another one.',
        });
      }
      if (existingRequest.status === 'Rejected') {
        existingRequest.message = message;
        existingRequest.status = 'Pending';
        existingRequest.patientAge = sanitizedAge;
        existingRequest.bottlesRequired = sanitizedBottles;
        existingRequest.hospitalName = hospitalName;
        existingRequest.city = city;
        existingRequest.pickAndDrop = pickAndDrop;
        existingRequest.exchangePossibility = exchangePossibility;
        existingRequest.caseDescription = caseDescription;
        existingRequest.attendantName = sanitizedName;
        existingRequest.attendantPhone = sanitizedPhone;
        existingRequest.createdAt = new Date();
        existingRequest.expiresAt = new Date(Date.now() + config.donation.requestExpiryMs);
        await existingRequest.save();

        try {
          const donor = await Donor.findById(donorId);
          if (donor && donor.email) {
            await sendEmail({
              to: donor.email,
              subject: '🩸 Blood Request Resent',
              html: `
                <h2>Hello ${donor.fullName},</h2>
                <p>A patient has updated and resent their blood request to you.</p>
                <p><strong>New Message:</strong> ${message}</p>
                <p>Please log in to your dashboard to review the updated details.</p>
                <br>
                <p>Thank you,<br>UnityDrop Team</p>
              `
            });
          }
        } catch (emailErr) {
          Logger.error('Failed to send resent blood request email:', emailErr.message);
        }
        return res.status(200).json({
          success: true,
          message: 'Request re-sent successfully after rejection',
          request: existingRequest,
        });
      }
    }
    const newRequest = await DonorRequest.create({
      donorId,
      patientId,
      message,
      patientAge: sanitizedAge,
      bottlesRequired: sanitizedBottles,
      hospitalName,
      city,
      pickAndDrop,
      exchangePossibility,
      caseDescription,
      attendantName: sanitizedName,
      attendantPhone: sanitizedPhone,
      status: 'Pending',
      expiresAt: new Date(Date.now() + config.donation.requestExpiryMs),
    });

    try {
      const donor = await Donor.findById(donorId);
      if (donor && donor.email) {
        await sendEmail({
          to: donor.email,
          subject: '🩸 New Blood Request Received',
          html: `
            <h2>Hello ${donor.fullName},</h2>
            <p>You have received a new blood request from a patient on UnityDrop.</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Hospital:</strong> ${hospitalName || 'Not specified'}</p>
            <p>Please log in to your dashboard to view the full details and Accept or Reject the request.</p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `
        });
      }
    } catch (emailErr) {
      Logger.error('Failed to send blood request email to donor:', emailErr.message);
    }
    res.status(201).json({
      success: true,
      message: 'Blood request sent successfully',
      request: newRequest || existingRequest,
    });
  } catch (error) {
    Logger.error('Error in sendBloodRequestToDonor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const addFeedback = async (req, res) => {
  try {
    const { message, rating, reaction } = req.body;
    const userId = req.user._id;
    // Logger.info('userId', userId);
    // Logger.info('req.user.role', req.user.role);
    const userModel = req.user.role === 'donor' ? 'Donor' : 'Patient';
    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Feedback message is required' });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }
    const allowedReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💡', '🤔', '👀'];
    if (reaction && !allowedReactions.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction emoji',
      });
    }
    const feedback = await feedbackModel.create({
      userId,
      userModel,
      message,
      rating,
      reaction,
    });
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (err) {
    Logger.error(' Add Feedback error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
const filterDonors = async (req, res) => {
  try {
    const { bloodGroup, location, name, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const query = {};
    query.emailVerified = true;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };
    const [donors, totalDonors] = await Promise.all([
      Donor.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Donor.countDocuments(query),
    ]);
    if (!donors || donors.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matching donors found',
        filters: { bloodGroup, location, name },
        pagination: {
          currentPage: pageNum,
          perPage: limitNum,
          totalPages: 0,
          totalResults: 0,
        },
        donors: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Matching donors found',
      filters: { bloodGroup, location, name },
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalPages: Math.ceil(totalDonors / limitNum),
        totalResults: totalDonors,
      },
      donors,
    });
  } catch (err) {
    Logger.error('Donor Filter error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
const getAllDonorRequestsForPatient = async (req, res) => {
  try {
    const patientId = req.user.id;
    const requests = await DonorRequest.find({ patientId })
      .populate('donorId', 'fullName email phone bloodGroup location')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      message: 'Requests fetched successfully',
      requests,
    });
  } catch (error) {
    Logger.error('Get all donor requests for patient error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
export {
  RegisterPatient,
  verifyEmailForPatient,
  PatientLogin,
  PatientPasswordResetLink,
  PatientPasswordReset,
  changePatientPassword,
  PatientLogout,
  GetPatient,
  PatientDeleteOurSelf,
  PatientUpdateProfile,
  getAllDonorsForPatient,
  getDonorByIdForPatient,
  sendBloodRequestToDonor,
  filterDonors,
  addFeedback,
  getStats,
  getAllDonorRequestsForPatient,
};