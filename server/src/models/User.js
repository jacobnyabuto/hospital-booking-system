import mongoose from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, "Email is not valid"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["patient", "doctor"],
        message: "Role must be patient or doctor",
      },
      default: "patient",
      required: true,
    },
    insurerName: {
      type: String,
      trim: true,
      maxlength: [80, "Insurer name must be at most 80 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Safety net: even if a controller forgets, these never leave the server
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const User = mongoose.model("User", userSchema);

export default User;