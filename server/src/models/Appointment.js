import mongoose from "mongoose";
import { SPECIALTIES } from "./Doctor.js";

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const appointmentSchema = new mongoose.Schema(
  {
    // Set by the server from the verified token, never from the request body
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient is required"],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor is required"],
    },

    // Snapshots of the doctor's details at booking time (like a receipt)
    doctorName: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      maxlength: 80,
    },
    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      enum: { values: SPECIALTIES, message: "Specialty is not supported" },
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: [0, "Fee cannot be negative"],
    },

    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    // Computed by the server: startTime + 30 minutes
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      validate: {
        validator: function (end) {
          return !this.startTime || end > this.startTime;
        },
        message: "End time must be after start time",
      },
    },

    status: {
      type: String,
      enum: { values: APPOINTMENT_STATUSES, message: "Status is not valid" },
      default: "pending",
      required: true,
    },
    // true while the appointment occupies its slot; kept in sync by the hook below
    holdsSlot: {
      type: Boolean,
      default: true,
      required: true,
    },

    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [1, "Reason is required"],
      maxlength: [300, "Reason must be at most 300 characters"],
    },
    cancelledBy: {
      type: String,
      enum: { values: ["patient", "doctor"], message: "cancelledBy is not valid" },
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Internal fields never leave the server
      transform(doc, ret) {
        delete ret.holdsSlot;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Keep holdsSlot in sync with status. Runs on save() and validate().
// NOTE: updateOne/findOneAndUpdate skip this hook, so controllers must use doc.save().
appointmentSchema.pre("validate", async function () {
  this.holdsSlot = this.status !== "cancelled";
});

// Patient dashboard: my appointments, newest first
appointmentSchema.index({ patient: 1, startTime: -1 });

// Doctor dashboard and slot generation: a doctor's appointments by time
appointmentSchema.index({ doctor: 1, startTime: 1 });

// Blocks two active bookings in the same slot, even under simultaneous requests.
// Cancelled appointments (holdsSlot: false) are ignored, so their slot can be rebooked.
appointmentSchema.index(
  { doctor: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { holdsSlot: true },
    name: "unique_active_slot",
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;