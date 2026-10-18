import mongoose from "mongoose";

export const SPECIALTIES = [
  "general-practice",
  "cardiology",
  "dermatology",
  "pediatrics",
  "orthopedics",
  "neurology",
  "gynecology",
  "psychiatry",
];

// "HH:mm" with minutes 00 or 30, so working hours always line up with 30-minute slots
const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [80, "Full name must be at most 80 characters"],
    },
    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      enum: { values: SPECIALTIES, message: "Specialty is not supported" },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [100, "Location must be at most 100 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [600, "Bio must be at most 600 characters"],
      default: "",
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: [0, "Fee cannot be negative"],
      default: 0,
    },
    rating: {
      type: Number,
      min: [0, "Rating must be between 0 and 5"],
      max: [5, "Rating must be between 0 and 5"],
      default: 0,
    },
    ratingCount: {
      type: Number,
      min: [0, "Rating count cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Rating count must be a whole number",
      },
    },
    acceptedInsurers: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: (days) =>
          days.length > 0 &&
          days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
          new Set(days).size === days.length,
        message: "Working days must be unique whole numbers from 0 (Sunday) to 6",
      },
    },
    workStart: {
      type: String,
      required: true,
      default: "09:00",
      match: [TIME_PATTERN, "Start time must be HH:00 or HH:30"],
    },
    workEnd: {
      type: String,
      required: true,
      default: "17:00",
      match: [TIME_PATTERN, "End time must be HH:00 or HH:30"],
      validate: {
        // Zero-padded "HH:mm" strings sort correctly as text
        validator: function (end) {
          return !this.workStart || end > this.workStart;
        },
        message: "End time must be after start time",
      },
    },
    slotMinutes: {
      type: Number,
      required: true,
      enum: { values: [30], message: "Slots are fixed at 30 minutes" },
      default: 30,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Public responses never expose the login-account link
      transform(doc, ret) {
        delete ret.user;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Doctor list filtered by specialty (active only)
doctorSchema.index({ isActive: 1, specialty: 1 });
// Name search and sorting
doctorSchema.index({ fullName: 1 });
// (user is already indexed as unique by the field definition above)

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;