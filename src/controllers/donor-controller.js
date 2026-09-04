import Logger from '../utils/logger.js';
import Donor from '../models/donor-model.js';
import Otp from '../models/otp-model.js';
import bcrypt from 'bcryptjs';
import { performLogin, performLogoutCleanup } from '../services/auth-utilities.js';
import jwt from 'jsonwebtoken';
import PasswordVerificationEmail from '../services/email/password-verify-email.js';
import Patient from '../models/patient-model.js';
import DonorRequest from '../models/donor-request-model.js';
import feedbackModel from '../models/feedback-model.js';
import { normalizeBloodGroup, normalizeGender, VALID_BLOOD_GROUPS } from '../utils/blood-helpers.js';
import EmailVerification from '../services/email/email-verification.js';
import PasswordVerifyModel from '../models/password-verify-model.js';
import sendEmail from '../services/email/email-helper.js';
const RegisterDonor = async (req, res) => {
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
    const existingUser = await Donor.findOne({ email });
    if (existingUser) {
      if (!existingUser.emailVerified) {
        EmailVerification(req, existingUser).catch((err) =>
          Logger.error(`Could not resend email: ${err.message || err}`)
        );
        return res.status(200).json({
          message: 'Account already created! A new OTP has been sent to your email.',
          donor: existingUser,
        });
      }
      return res.status(409).json({
        message: 'Email already exists',
        success: false,
        data: null,
      });
    }

    const existingPhone = await Donor.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        message: 'Phone number already exists',
        success: false,
        data: null,
      });
    }

    const newDonor = new Donor({
      fullName,
      email,
      password,
      gender: genderNormalized,
      bloodGroup,
      location,
      address,
      phone,
      availabilityStatus: availabilityStatus || false,
    });
    await newDonor.save();
    EmailVerification(req, newDonor).catch((err) =>
      Logger.error(`Failed to send verification email: ${err.message || err}`)
    );
    return res.status(201).json({
      message:
        'Donor Registration successful! Please verify your email to activate your account.',
      donor: newDonor,
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
    Logger.error('Register Donor error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
const verifyEmailForDonor = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) {
      return res.status(400).json({ message: 'OTP and email are required', error: 'OTP and email are required' });
    }
    const user = await Donor.findOne({ email });
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
      message: 'Donor Email verified successfully',
    });
  } catch (err) {
    Logger.error('Email verification error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
const DonorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: 'Email and password are required' });
    }
    const user = await Donor.findOne({ email }).select('+password');
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
    const result = performLogin(user, 'Donor', res);
    return res.status(200).json(result);
  } catch (err) {
    Logger.error('Login error:', err.message);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};
const DonorPasswordResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await Donor.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const a = await PasswordVerificationEmail(req, user);
    // Logger.info('a', a);
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
const DonorPasswordReset = async (req, res) => {
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
    const user = await Donor.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    try {
      jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    user.password = password;
    await user.save();
    // Remove old verification otp
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
const changeDonorPassword = async (req, res) => {
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
    const user = await Donor.findById(req.user.id);
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
const DonorLogout = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const result = performLogoutCleanup(res, 'Donor');
    return res.status(200).json(result);
  } catch (err) {
    Logger.error('Logout error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};
const GetDonor = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
      message: 'Donor fetched successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
const DonorDeleteOurSelf = async (req, res) => {
  try {
    const { id } = req.user;
    await Donor.findByIdAndDelete(id);
    await DonorRequest.deleteMany({ donorId: id });
    await feedbackModel.deleteMany({ userId: id, userModel: 'Donor' });
    const result = performLogoutCleanup(res, 'Donor', 'Donor account deleted successfully');
    res.status(200).json(result);
  } catch (err) {
    Logger.error('Donor delete error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const DonorUpdateProfile = async (req, res, next) => {
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
      const existingPhone = await Donor.findOne({
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
      return res.status(400).json({
        success: false,
        message: `Invalid blood group: ${newUserData.bloodGroup}`,
      });
    }
    const updatedUser = await Donor.findByIdAndUpdate(
      currentUser.id,
      { $set: newUserData },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Donor Profile Updated Successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already exists',
      });
    }
    Logger.error(' Donor update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getAllPatientsForDonor = async (req, res) => {
  try {
    const { page = 1, limit = 10, name, bloodGroup, location } = req.query;
    const query = {};
    if (name) query.fullName = { $regex: name, $options: 'i' };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    let result;
    if (name || bloodGroup || location) {
      const patients = await Patient.find(query)
        .sort({ createdAt: -1 })
        .select('fullName email gender bloodGroup location availabilityStatus')
        .lean();
      result = {
        docs: patients,
        totalDocs: patients.length,
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
      result = await Patient.paginate(query, options);
    }
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
    res.status(500).json({ success: false, error: error.message });
  }
};
const getPatientByIdForDonor = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { id: patientId } = req.params;
    const latestRequest = await DonorRequest.findOne({
      donorId,
      patientId,
    }).sort({ createdAt: -1 });
    const isApproved = latestRequest?.status === 'Approved';
    let patient;
    if (isApproved) {
      // Approved → show full patient details
      patient = await Patient.findById(patientId).select('-password').lean();
    } else {
      // Otherwise show limited info only
      patient = await Patient.findById(patientId).select(
        'fullName email gender bloodGroup location phone availabilityStatus createdAt updatedAt',
      ).lean();
    }
    Logger.info(`[DonorController] getPatientByIdForDonor - Fetched Patient: ${patient ? patient._id : 'NULL'}`);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }
    res.status(200).json({
      success: true,
      patient,
      status: latestRequest?.status || null,
      message: 'Patient fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
const getAllPatientRequestsForDonor = async (req, res) => {
  try {
    const donorId = req.user.id;
    const requests = await DonorRequest.find({ donorId })
      .populate('patientId', 'fullName email message')
      .sort({ createdAt: -1 })
      .lean();
    if (!requests || requests.length === 0) {
      return res.status(200).json({
        success: true,
        requests: [],
        message: 'No patient requests found for this donor.',
      });
    }
    res.status(200).json({
      success: true,
      requests,
      message: 'All patient requests fetched successfully.',
    });
  } catch (error) {
    Logger.error('Error fetching donor requests:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
};
const updatePatientRequestStatusByDonor = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await DonorRequest.findOneAndUpdate(
      { _id: requestId, status: 'Pending' },
      { $set: { status } },
      { new: true }
    ).populate('patientId', '-password');

    if (!request) {
      // Check if it exists but is already processed
      const existing = await DonorRequest.findById(requestId);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Request already processed or not in Pending state' });
      }
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const donorId = req.user.id;

    try {
      const patient = request.patientId;
      if (patient && patient.email) {
        const statusText = status === 'Approved' ? '✅ Accepted' : '❌ Rejected';
        const donorName = req.user.fullName || 'A Donor';
        await sendEmail({
          to: patient.email,
          subject: `Blood Request ${statusText}`,
          html: `
            <h2>Hello ${patient.fullName},</h2>
            <p>Your blood request on UnityDrop has been <strong>${status}</strong> by ${donorName}.</p>
            <p>Please log in to your dashboard to view the update.</p>
            <br>
            <p>Thank you,<br>UnityDrop Team</p>
          `
        });
      }
    } catch (emailErr) {
      Logger.error('Failed to send request status email to patient:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message:
        status === 'Approved'
          ? 'You have approved the patient’s request.'
          : 'You have rejected the patient’s request.',
      request,
    });
  } catch (error) {
    Logger.error('updatePatientRequestStatusByDonor error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
const addFeedback = async (req, res) => {
  try {
    const { message, rating, reaction } = req.body;
    const userId = req.user._id;
    const userModel = req.user.role === 'donor' ? 'Donor' : 'Patient';
    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message is required',
      });
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
      message: message.trim(),
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
const getStats = async (req, res) => {
  try {
    const donorId = req.user._id;
    const [totalPatients, pendingRequests, totalApproved, totalRejected, totalRequests] = await Promise.all([
      Patient.countDocuments({}),
      DonorRequest.countDocuments({ donorId, status: 'Pending' }),
      DonorRequest.countDocuments({ donorId, status: 'Approved' }),
      DonorRequest.countDocuments({ donorId, status: 'Rejected' }),
      DonorRequest.countDocuments({ donorId }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      totalPatients,
      pendingRequests,
      totalApproved,
      totalRejected,
      totalRequests,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const filterPatients = async (req, res) => {
  try {
    const { bloodGroup, location, name, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };
    const [patients, totalPatients] = await Promise.all([
      Patient.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Patient.countDocuments(query),
    ]);
    if (!patients || patients.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matching patients found',
        filters: { bloodGroup, location, name },
        pagination: {
          currentPage: pageNum,
          perPage: limitNum,
          totalPages: 0,
          totalResults: 0,
        },
        patients: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Matching patients found',
      filters: { bloodGroup, location, name },
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalPages: Math.ceil(totalPatients / limitNum),
        totalResults: totalPatients,
      },
      patients,
    });
  } catch (err) {
    Logger.error('Patient Filter error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
export {
  RegisterDonor,
  verifyEmailForDonor,
  DonorLogin,
  DonorPasswordResetLink,
  DonorPasswordReset,
  changeDonorPassword,
  DonorLogout,
  GetDonor,
  DonorDeleteOurSelf,
  DonorUpdateProfile,
  getAllPatientsForDonor,
  getPatientByIdForDonor,
  getAllPatientRequestsForDonor,
  updatePatientRequestStatusByDonor,
  addFeedback,
  getStats,
  filterPatients,
};