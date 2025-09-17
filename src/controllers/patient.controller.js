/** @format */

import Patient from '../models/patient.model.js';
import Otp from '../models/otp.model.js';
import EmailVerification from '../services/email/emailVerification.js';
import bcrypt from 'bcryptjs';
import {
  generateTokens,
  setTokensCookies,
} from '../services/token/token.service.js';
import jwt from 'jsonwebtoken';
import PasswordVerificationEmail from '../services/email/PasswordVerifyEmail.js';
import PasswordVerifyModel from '../models/passwordVerify.model.js';
import Donor from '../models/donor.model.js';
import DonorRequest from '../models/donorRequest.model.js';
import warningModel from '../models/warning.model.js';
import feedbackModel from '../models/feedback.model.js';
import {
  COMPAT_MAP,
  computeScoreForPatient,
  normalizeBlood,
} from '../services/scorer.js';
import {
  buildUserPromptForMatching,
  SYSTEM_MATCH_PROMPT,
} from '../services/aiPrompts.js';
import { callGemini } from '../services/aiClient.js';

const RegisterPatient = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      password_confirmation,
      gender,
      bloodGroup,
      location,
      address,
      phone,
      availabilityStatus,
      hospitalName,
      hospitalAddress,
      hospitalLocation,
    } = req.body;

    // Required fields check
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
      return res
        .status(400)
        .json({ message: 'All required fields must be filled' });
    }

    // Confirm password match
    if (password !== password_confirmation) {
      return res
        .status(400)
        .json({ message: 'Password and confirm password do not match' });
    }

    // Check if email already exists
    const existingUser = await Patient.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const newPatient = new Patient({
      fullName,
      email,
      password,
      gender,
      bloodGroup,
      location,
      address,
      phone,
      availabilityStatus,
      hospitalName,
      hospitalAddress,
      hospitalLocation,
    });

    await newPatient.save();

    try {
      await EmailVerification(req, newPatient); // send OTP email
    } catch (err) {
      console.error('Failed to send verification email:', err.message);
    }

    res.status(201).json({
      message:
        'Patient Registration successful! Please verify your email to activate your account.',
      patient: newPatient,
    });
  } catch (error) {
    console.error('Register Patient error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
const verifyEmailForPatient = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ message: 'OTP and email are required' });
    }

    const user = await Patient.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res
        .status(400)
        .json({ message: 'Email already verified, please login' });
    }

    const emailVerification = await Otp.findOne({
      userId: user._id,
      otpNumber: otp,
    });

    if (!emailVerification) {
      // send new OTP if invalid
      await EmailVerification(req, user);
      return res
        .status(400)
        .json({ message: 'Invalid OTP, new OTP sent to your email' });
    }

    if (new Date() > new Date(emailVerification.otpExpirationTime)) {
      await EmailVerification(req, user);
      return res
        .status(400)
        .json({ message: 'OTP has expired, new OTP sent to your email' });
    }

    user.emailVerified = true;
    await user.save();

    await Otp.deleteMany({ userId: user._id });

    return res.status(200).json({
      status: 'success',
      message: 'Patient Email verified successfully',
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
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

    // Generate new tokens
    const { accessToken, accessTokenExp } = await generateTokens(user);
    setTokensCookies(res, { accessToken });

    res.status(200).json({
      status: 'success',
      message: 'Patient Login successful',
      user,
      authCheck: {
        accessToken,
        accessTokenExp,
      },
    });
  } catch (err) {
    console.error('Patient Login error:', err.message);
    res.status(500).json({ status: false, error: err.message });
  }
};
const getStats = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      totalDonors,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    console.error('Password reset link error:', err.message);
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
    console.error('Password reset error:', err.message);
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
    console.error('Password change error:', err.message);
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

    res.clearCookie('accessToken');
    res.clearCookie('is_auth');

    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
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
const PatientDeleteOurSelf = async (req, res) => {
  try {
    const { id } = req.user;
    const deletedUser = await Patient.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Patient account deleted successfully',
    });
  } catch (err) {
    console.error('Patient delete error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const PatientUpdateProfile = async (req, res, next) => {
  try {
    const { body, user: currentUser } = req;

    let newUserData = {};
    if (body.fullName) newUserData.fullName = body.fullName;
    if (body.gender) newUserData.gender = body.gender;
    if (body.phone) newUserData.phone = body.phone;
    if (body.location) newUserData.location = body.location;
    if (body.address) newUserData.address = body.address;
    if (body.bloodGroup) newUserData.bloodGroup = body.bloodGroup;
    if (body.hospitalName) newUserData.hospitalName = body.hospitalName;
    if (body.hospitalAddress)
      newUserData.hospitalAddress = body.hospitalAddress;
    if (body.hospitalLocation)
      newUserData.hospitalLocation = body.hospitalLocation;
    if (typeof body.availabilityStatus !== 'undefined')
      newUserData.availabilityStatus = body.availabilityStatus;

    const updatedUser = await Patient.findByIdAndUpdate(
      currentUser.id,
      newUserData,
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
    console.error('Patient update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null,
    });
  }
};
const getAllDonorsForPatient = async (req, res) => {
  try {
    const { page = 1, limit = 10, name, bloodGroup, location } = req.query;

    // Build query filters
    const query = {};
    if (name) query.fullName = { $regex: new RegExp(name, 'i') };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };

    let result;

    if (name || bloodGroup || location) {
      // 🔹 If any filter is applied, fetch ALL matching results (ignore pagination)
      const donors = await Donor.find(query)
        .sort({ createdAt: -1 })
        .select('fullName email gender bloodGroup location availabilityStatus');
      result = {
        docs: donors,
        totalDocs: donors.length,
        totalPages: 1,
        page: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    } else {
      // 🔹 No filter applied → use pagination
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        select: 'fullName email gender bloodGroup location availabilityStatus',
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
    console.error('Donor Failded:', error.message);
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

    // Check if patient has an approved request for this donor
    const request = await DonorRequest.findOne({
      patientId,
      donorId: id,
      status: 'Approved',
    });

    let donor;
    if (request) {
      // If approved, show full donor details
      donor = await Donor.findById(id).select(
        '-password' // hide password only
      );
    } else {
      // Otherwise, show only basic info
      donor = await Donor.findById(id).select(
        'fullName email gender bloodGroup availabilityStatus'
      );
    }

    if (!donor) {
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });
    }

    res.status(200).json({
      success: true,
      donor,
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
    const { donorId } = req.params; // donor ID comes from URL param
    const { message } = req.body; // message comes from body
    const patientId = req.user.id;

    if (!donorId || !message) {
      return res
        .status(400)
        .json({ success: false, message: 'Donor ID and message are required' });
    }

    // Prevent duplicate requests
    const existingRequest = await DonorRequest.findOne({ donorId, patientId });
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    const request = await DonorRequest.create({
      donorId,
      patientId,
      message,
      status: 'Pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    res.status(201).json({
      success: true,
      message: 'Blood request sent successfully',
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getPatientResponses = async (req, res) => {
  try {
    const patientId = req.user._id;
    const responses = await warningModel
      .find({ patientId })
      .populate('donorId', 'fullName email')
      .populate('createdBy', 'fullName') // admin info
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const filterDonors = async (req, res) => {
  try {
    const { bloodGroup, location, name, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // ✅ Build query dynamically
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };

    // ✅ Fetch donors & count in parallel
    const [donors, totalDonors] = await Promise.all([
      Donor.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Donor.countDocuments(query),
    ]);

    if (!donors || donors.length === 0) {
      // ❌ No data found
      return res.status(200).json({
        success: false,
        message: 'No matching donors found',
        filters: { bloodGroup, location, name },
        donors: [],
      });
    }

    // ✅ Data found
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
    console.error('❌ Donor Filter error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
const addFeedback = async (req, res) => {
  try {
    const { message, rating } = req.body;
    const userId = req.user._id; // from JWT
    // console.log('userId', userId);
    // console.log('req.user.role', req.user.role);
    const userModel = req.user.role === 'donor' ? 'Donor' : 'Patient';

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: 'Feedback message is required' });
    }

    const feedback = await feedbackModel.create({
      userId,
      userModel,
      message,
      rating,
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (err) {
    console.error('❌ Add Feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
const DEFAULT_FETCH_LIMIT = Number(process.env.DEFAULT_FETCH_LIMIT) || 50;
const patientSuggestionsAI = async (req, res) => {
  try {
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    const patientBG = normalizeBlood(patient.bloodGroup);
    // Build list of donor blood groups that can donate to this patient:
    // COMPAT_MAP maps donorGroup -> [receivable groups]. We want keys where patientBG is included.
    const compatibleDonorGroups = Object.keys(COMPAT_MAP).filter((donorGroup) =>
      COMPAT_MAP[donorGroup].includes(patientBG)
    );

    let candidates = [];

    // CASE: If patient is universal recipient (AB+), compatibleDonorGroups will include many groups.
    // We'll fetch donors whose bloodGroup is in compatibleDonorGroups.
    if (!compatibleDonorGroups.length) {
      return res.json({
        success: true,
        message: `No compatible donor blood groups found for patient blood type (${patientBG})`,
        results: [],
      });
    }

    // Fetch donors (availability / location fields used later)
    candidates = await Donor.find({
      bloodGroup: { $in: compatibleDonorGroups },
    })
      .select(
        'bloodGroup location availabilityStatus createdAt fullName email hospitalName'
      )
      .limit(DEFAULT_FETCH_LIMIT)
      .lean();

    if (!candidates.length) {
      return res.json({
        success: true,
        message:
          'No donors found that match compatible blood groups at the moment.',
        results: [],
      });
    }

    // Local scoring (donor -> patient)
    const scoredCandidates = candidates.map((c) => ({
      ...c,
      score: computeScoreForPatient(c, patient),
    }));

    // Build AI prompt (we can reuse buildUserPromptForMatching but pass target = patient)
    const userPrompt = buildUserPromptForMatching({
      target: patient,
      candidates: scoredCandidates,
      params: { role: 'patient' },
    });

    const aiResponse = await callGemini({
      systemPrompt: SYSTEM_MATCH_PROMPT,
      userPrompt,
    });

    const results = (aiResponse.results || [])
      .map((r) => {
        const candidate = scoredCandidates.find(
          (c) => c._id?.toString() === r.id || c.id === r.id
        );
        // If candidate not found, skip it (strictness)
        if (!candidate) return null;
        return {
          ...candidate,
          aiScore: r.score,
          reason: r.reason,
          urgency: r.urgency,
          suggestion: r.suggestion,
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      message: 'AI-powered donor suggestions for patient generated.',
      total: results.length,
      results,
    });
  } catch (err) {
    console.error('patientSuggestionsAI error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
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
  getPatientResponses,
  filterDonors,
  addFeedback,
  getStats,
  patientSuggestionsAI,
};
