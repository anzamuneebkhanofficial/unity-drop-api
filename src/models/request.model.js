/** @format */
import mongoose from 'mongoose';

const RequestSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
    },
  },
  { timestamps: true }
);

const Request =
  mongoose.models.Request || mongoose.model('Request', RequestSchema);
export default Request;
