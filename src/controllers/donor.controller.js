/** @format */

import Donor from '../models/donor.model.js';
import Otp from '../models/otp.model.js';
import bcrypt from 'bcryptjs';
import {
  generateTokens,
  setTokensCookies,
} from '../services/token/token.service.js';
import jwt from 'jsonwebtoken';
import PasswordVerificationEmail from '../services/email/PasswordVerifyEmail.js';
import Patient from '../models/patient.model.js';
import DonorRequest from '../models/donorRequest.model.js';
import BadRequest from '../models/badRequest.model.js';
import sendEmail from '../services/email/emailHelper.js';
import warningModel from '../models/warning.model.js';
import feedbackModel from '../models/feedback.model.js';
import {
  COMPAT_MAP,
  computeScore,
  escapeRegex,
  normalizeBlood,
} from '../services/scorer.js';
import {
  buildUserPromptForMatching,
  SYSTEM_MATCH_PROMPT,
} from '../services/aiPrompts.js';
import { callGemini } from '../services/aiClient.js';
import EmailVerification from '../services/email/EmailVerification.js';
import PasswordVerifyModel from '../models/PasswordVerify.model.js';
const RegisterDonor = async (req, res) => {
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
    } = req.body;

    // ✅ Normalize bloodGroup
    if (typeof bloodGroup === 'string') {
      bloodGroup = bloodGroup.trim();
      if (bloodGroup === 'AB') {
        bloodGroup = 'AB+';
      } else if (bloodGroup === 'O') {
        bloodGroup = 'O+';
      } else if (bloodGroup === 'A') {
        bloodGroup = 'A+';
      } else if (bloodGroup === 'B') {
        bloodGroup = 'B+';
      }
    }
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
      return res.status(400).json({
        message: 'All required fields must be filled',
        success: false,
        data: null,
      });
    }

    // Confirm password match
    if (password !== password_confirmation) {
      return res.status(400).json({
        message: 'Password and confirm password do not match',
        success: false,
        data: null,
      });
    }

    // Check if email already exists
    const existingUser = await Donor.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'Email already exists',
        success: false,
        data: null,
      });
    }

    const newDonor = new Donor({
      fullName,
      email,
      password,
      gender,
      bloodGroup,
      location,
      address,
      phone,
      availabilityStatus,
    });

    await newDonor.save();

    try {
      const a = await EmailVerification(req, newDonor); // send OTP email
      // console.log('email sent', a);
    } catch (err) {
      console.error('Failed to send verification email:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      message:
        'Donor Registration successful! Please verify your email to activate your account.',
      donor: newDonor,
    });
  } catch (error) {
    console.error('Register Donor error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
const verifyEmailForDonor = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ message: 'OTP and email are required' });
    }

    const user = await Donor.findOne({ email });
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
      message: 'Donor Email verified successfully',
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
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

    // Generate new tokens
    const { accessToken, accessTokenExp } = await generateTokens(user);
    setTokensCookies(res, { accessToken });

    res.status(200).json({
      status: 'success',
      message: 'Donor Login successful',
      user,
      authCheck: {
        accessToken,
        accessTokenExp,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
      data: null,
    });
  }
};
const DonorPasswordResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await Donor.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Send password reset email
    const a = await PasswordVerificationEmail(req, user);
    // console.log('a', a);
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
    // Update password
    user.password = password;
    await user.save();

    // Remove old verification records
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
    console.error('Password change error:', err.message);
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
    const deletedUser = await Donor.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Donor account deleted successfully',
    });
  } catch (err) {
    console.error('❌ Donor delete error:', err.message);
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

    // Only allow updating specific fields
    let newUserData = {};
    if (body.fullName) newUserData.fullName = body.fullName;
    if (body.gender) newUserData.gender = body.gender;
    if (body.phone) newUserData.phone = body.phone;
    if (body.location) newUserData.location = body.location;
    if (body.address) newUserData.address = body.address;
    if (body.bloodGroup) newUserData.bloodGroup = body.bloodGroup;
    if (typeof body.availabilityStatus !== 'undefined')
      newUserData.availabilityStatus = body.availabilityStatus;

    const updatedUser = await Donor.findByIdAndUpdate(
      currentUser.id,
      newUserData,
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
    console.error('❌ Donor update error:', error.message);
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

    // Build query filters
    const query = {};
    if (name) query.fullName = { $regex: new RegExp(name, 'i') };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: new RegExp(location, 'i') };

    let result;

    if (name || bloodGroup || location) {
      // 🔹 If any filter is applied, fetch ALL matching results (ignore pagination)
      const patients = await Patient.find(query)
        .sort({ createdAt: -1 })
        .select('fullName email gender bloodGroup location availabilityStatus');
      result = {
        docs: patients,
        totalDocs: patients.length,
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
    const { id: patientId } = req.params; // patient ID
    // console.log(donorId, patientId);
    // Check if donor has an approved request from this patient
    const request = await DonorRequest.findOne({
      donorId,
      patientId,
      status: 'Approved',
    });

    let patient;
    if (request) {
      // Approved → show full patient details
      patient = await Patient.findById(patientId).select('-password');
    } else {
      // Otherwise → show limited info only
      patient = await Patient.findById(patientId).select(
        'fullName email gender bloodGroup location availabilityStatus'
      );
    }

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    res.status(200).json({
      success: true,
      patient,
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
      .populate('patientId', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
      message: 'All patient requests fetched successfully',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
const handleDecline = async (donorId, patientId) => {
  try {
    // ✅ Fetch full patient details
    const patient = await Patient.findById(patientId).select('fullName email');
    if (!patient) throw new Error('Patient not found');

    // ✅ Fetch donor details
    const donor = await Donor.findById(donorId).select('fullName email');
    if (!donor) throw new Error('Donor not found');

    // ✅ Check if a bad request already exists
    let badRequest = await BadRequest.findOne({
      donorId,
      patientId: patient._id,
    });

    if (badRequest) {
      badRequest.declineCount += 1;

      // ✅ If decline count > 2 → send warning emails
      if (badRequest.declineCount > 2) {
        // Email to Donor
        await sendEmail({
          to: donor.email,
          subject: '⚠️ Warning: Multiple Patient Rejections',
          html: `
            <h2>Hello ${donor.fullName},</h2>
            <p>You have rejected patient requests more than 2 times.</p>
            <p>This is a warning from the Admin. If you continue rejecting patients without genuine reason, your donor account may be removed.</p>
            <p>Please be serious about helping patients.</p>
          `,
        });

        // Email to Patient
        await sendEmail({
          to: patient.email,
          subject: '⚠️ Update: Your Donor Declined Again',
          html: `
            <h2>Hello ${patient.fullName},</h2>
            <p>Your donor <b>${donor.fullName}</b> has declined your request more than 2 times.</p>
            <p>We are aware of this issue and will try to arrange another donor for you soon. 
            Meanwhile, you may also look for other available donors.</p>
            <p>Sorry for the inconvenience. We appreciate your patience.</p>
          `,
        });

        // console.log(
        //   `⚠️ Emails sent to donor ${donor.email} and patient ${patient.email}`
        // );
      }

      // Reset expiry (24h window)
      badRequest.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await badRequest.save();
    } else {
      // ✅ First decline entry
      badRequest = await BadRequest.create({
        donorId,
        patientId: patient._id,
        patientName: patient.fullName,
        patientEmail: patient.email,
        declineCount: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    return badRequest;
  } catch (err) {
    console.error('handleDecline error:', err.message);
    throw err; // ❌ don’t use res here, just throw
  }
};
const updatePatientRequestStatusByDonor = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await DonorRequest.findById(requestId).populate(
      'patientId',
      '-password'
    );
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    const donorId = req.user.id;
    // If donor rejects → call handleDecline
    if (status === 'Rejected') {
      await handleDecline(donorId, request.patientId);
    }

    request.status = status;
    await request.save();

    res.status(200).json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      request,
    });
  } catch (error) {
    console.error('updatePatientRequestStatusByDonor error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
const getDonorWarnings = async (req, res) => {
  try {
    const donorId = req.user._id; // donor logged in
    const warnings = await warningModel
      .find({ donorId })
      .populate('createdBy', 'fullName') // show admin name
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, warnings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const filterPatients = async (req, res) => {
  try {
    const { bloodGroup, location, name, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // ✅ Build query dynamically
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (name) query.fullName = { $regex: name, $options: 'i' };

    // ✅ Fetch patients & count in parallel
    const [patients, totalPatients] = await Promise.all([
      Patient.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Patient.countDocuments(query),
    ]);

    if (!patients || patients.length === 0) {
      // ❌ No data found
      return res.status(200).json({
        success: false,
        message: 'No matching patients found',
        filters: { bloodGroup, location, name },
        patients: [],
      });
    }

    // ✅ Data found
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
    console.error('❌ Patient Filter error:', err.message);
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
    console.error('❌ Add Feedback error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
const DEFAULT_FETCH_LIMIT = Number(process.env.DEFAULT_FETCH_LIMIT) || 50;
const donorSuggestionsAI = async (req, res) => {
  try {
    const donorId = req.user._id;
    const donor = await Donor.findById(donorId).lean();
    if (!donor) {
      return res
        .status(404)
        .json({ success: false, message: 'Donor not found' });
    }

    const donorBG = normalizeBlood(donor.bloodGroup);
    const donorLoc = donor.location;
    const compatibleGroups = COMPAT_MAP[donorBG] || [];

    let candidates = [];

    // 🩸 CASE 1: Universal Donor (O-)
    if (donorBG === 'O-') {
      candidates = await Patient.find({})
        .select('bloodGroup location availabilityStatus createdAt hospitalName')
        .limit(DEFAULT_FETCH_LIMIT)
        .lean();

      if (!candidates.length) {
        return res.json({
          success: true,
          message: 'No patients found at all in the system',
          results: [],
        });
      }
    }

    // 🩸 CASE 2: Normal Donor (non-universal)
    else {
      candidates = await Patient.find({ bloodGroup: { $in: compatibleGroups } })
        .select('bloodGroup location availabilityStatus createdAt hospitalName')
        .limit(DEFAULT_FETCH_LIMIT)
        .lean();

      if (!candidates.length) {
        // 🩸 CASE 3: Rare blood but no patients
        return res.json({
          success: true,
          message: `Your blood type (${donorBG}) is rare. Currently no matching patients.`,
          results: [],
        });
      }
    }

    // ✅ Local scoring
    const scoredCandidates = candidates.map((c) => ({
      ...c,
      score: computeScore(c, donor),
    }));

    // ✅ Build AI prompt
    const userPrompt = buildUserPromptForMatching({
      target: donor,
      candidates: scoredCandidates,
      params: { role: 'donor' }, // 👈 add role here
    });

    const aiResponse = await callGemini({
      systemPrompt: SYSTEM_MATCH_PROMPT,
      userPrompt,
    });

    const results = aiResponse.results.map((r) => {
      const candidate = scoredCandidates.find(
        (c) => c._id.toString() === r.id || c.id === r.id
      );
      return {
        ...candidate,
        aiScore: r.score,
        reason: r.reason,
        urgency: r.urgency,
        suggestion: r.suggestion,
      };
    });

    return res.json({
      success: true,
      message:
        donorBG === 'O-'
          ? 'You are a universal donor (O-). Here are potential patients ranked by priority.'
          : 'AI-powered donor suggestions generated dynamically.',
      total: results.length,
      results,
    });
  } catch (err) {
    console.error('donorSuggestionsAI error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
const getStats = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      totalPatients,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  getDonorWarnings,
  filterPatients,
  addFeedback,
  donorSuggestionsAI,
  getStats,
};
