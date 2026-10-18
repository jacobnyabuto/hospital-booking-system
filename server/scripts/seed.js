import "dotenv/config";
import readline from "node:readline/promises";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Doctor from "../src/models/Doctor.js";

const DEMO_DOMAIN = "hospital-demo.test"; // reserved .test domain: never a real address

const DOCTORS = [
  {
    name: "Dr. Alan Rivera", email: `alan.rivera@${DEMO_DOMAIN}`,
    specialty: "cardiology", location: "Dallas, TX",
    bio: "Fictional demo profile. Heart health and cardiac check-ups.",
    consultationFee: 120, rating: 4.6, ratingCount: 38,
    acceptedInsurers: ["Sample Health Co", "Demo Care Plan"],
    workingDays: [1, 2, 3, 4, 5], workStart: "09:00", workEnd: "17:00",
  },
  {
    name: "Dr. Priya Nair", email: `priya.nair@${DEMO_DOMAIN}`,
    specialty: "general-practice", location: "Fort Worth, TX",
    bio: "Fictional demo profile. Family medicine and routine check-ups.",
    consultationFee: 70, rating: 4.8, ratingCount: 112,
    acceptedInsurers: ["Sample Health Co", "Demo Care Plan", "Example Mutual"],
    workingDays: [1, 2, 3, 4, 5, 6], workStart: "08:00", workEnd: "16:00",
  },
  {
    name: "Dr. Marcus Bell", email: `marcus.bell@${DEMO_DOMAIN}`,
    specialty: "dermatology", location: "Dallas, TX",
    bio: "Fictional demo profile. Skin conditions and skin-health advice.",
    consultationFee: 95, rating: 4.4, ratingCount: 51,
    acceptedInsurers: ["Demo Care Plan"],
    workingDays: [2, 3, 4, 5, 6], workStart: "10:00", workEnd: "18:00",
  },
  {
    name: "Dr. Elena Rossi", email: `elena.rossi@${DEMO_DOMAIN}`,
    specialty: "pediatrics", location: "Arlington, TX",
    bio: "Fictional demo profile. Care for infants, children and teenagers.",
    consultationFee: 80, rating: 4.9, ratingCount: 87,
    acceptedInsurers: ["Sample Health Co", "Example Mutual"],
    workingDays: [1, 2, 3, 4, 5], workStart: "09:00", workEnd: "15:00",
  },
  {
    name: "Dr. Samir Haddad", email: `samir.haddad@${DEMO_DOMAIN}`,
    specialty: "orthopedics", location: "Irving, TX",
    bio: "Fictional demo profile. Bones, joints and sports injuries.",
    consultationFee: 110, rating: 4.3, ratingCount: 29,
    acceptedInsurers: ["Example Mutual"],
    workingDays: [1, 3, 4, 5], workStart: "09:00", workEnd: "17:00",
  },
  {
    name: "Dr. Grace Okoye", email: `grace.okoye@${DEMO_DOMAIN}`,
    specialty: "neurology", location: "Plano, TX",
    bio: "Fictional demo profile. Headaches, nerves and brain health.",
    consultationFee: 150, rating: 4.7, ratingCount: 44,
    acceptedInsurers: ["Sample Health Co", "Demo Care Plan"],
    workingDays: [1, 2, 3, 4], workStart: "09:00", workEnd: "16:00",
  },
];

const DEMO_PATIENT = {
  name: "Demo Patient",
  email: `demo.patient@${DEMO_DOMAIN}`,
  insurerName: "Sample Health Co",
};

function passwordProblem(name, value) {
  if (!value) return `${name} is missing in server/.env`;
  if (value.length < 8) return `${name} must be at least 8 characters`;
  if (/^(replace-with|CHOOSE|not-chosen)/i.test(value)) {
    return `${name} still has a placeholder value`;
  }
  return null;
}

async function confirm() {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Type "yes" to continue: ');
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

// Create the user if missing, otherwise update it. Never touches other accounts.
async function upsertUser({ name, email, role, password, insurerName }) {
  let user = await User.findOne({ email }).select("+passwordHash");
  const created = !user;
  if (user && user.role !== role) {
    throw new Error(`Refusing to change role of existing account ${email}`);
  }
  if (!user) user = new User({ email });
  user.name = name;
  user.role = role;
  user.passwordHash = await bcrypt.hash(password, 10);
  if (insurerName !== undefined) user.insurerName = insurerName;
  await user.save();
  return { user, created };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV is production.");
    process.exitCode = 1;
    return;
  }

  const problems = [
    passwordProblem("SEED_DOCTOR_PASSWORD", process.env.SEED_DOCTOR_PASSWORD),
    passwordProblem("SEED_PATIENT_PASSWORD", process.env.SEED_PATIENT_PASSWORD),
  ].filter(Boolean);
  if (problems.length) {
    problems.forEach((p) => console.error(p));
    process.exitCode = 1;
    return;
  }

  await connectDB();

  console.log("");
  console.log("WARNING: this script writes to the database above.");
  console.log(`  - Creates or UPDATES ${DOCTORS.length} doctor accounts and profiles`);
  console.log("    (their profile fields and passwords are reset to the seed values)");
  console.log(`  - Creates or UPDATES 1 demo patient (${DEMO_PATIENT.email})`);
  console.log("  - Does not delete anything and does not touch other users");
  console.log("");

  if (!(await confirm())) {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  const doctorPassword = process.env.SEED_DOCTOR_PASSWORD;
  const patientPassword = process.env.SEED_PATIENT_PASSWORD;

  for (const d of DOCTORS) {
    const { user, created } = await upsertUser({
      name: d.name, email: d.email, role: "doctor", password: doctorPassword,
    });

    let profile = await Doctor.findOne({ user: user._id });
    if (!profile) profile = new Doctor({ user: user._id });
    profile.fullName = d.name;
    profile.specialty = d.specialty;
    profile.location = d.location;
    profile.bio = d.bio;
    profile.consultationFee = d.consultationFee;
    profile.rating = d.rating;
    profile.ratingCount = d.ratingCount;
    profile.acceptedInsurers = d.acceptedInsurers;
    profile.workingDays = d.workingDays;
    profile.workStart = d.workStart;
    profile.workEnd = d.workEnd;
    profile.isActive = true;
    await profile.save();

    console.log(`Doctor ${created ? "created" : "updated"}: ${d.name}`);
  }

  const patient = await upsertUser({
    ...DEMO_PATIENT, role: "patient", password: patientPassword,
  });
  console.log(`Patient ${patient.created ? "created" : "updated"}: ${DEMO_PATIENT.name}`);

  const doctorUsers = await User.countDocuments({ role: "doctor", email: { $regex: `@${DEMO_DOMAIN}$` } });
  const profiles = await Doctor.countDocuments();
  console.log(`Done. Demo doctor users: ${doctorUsers}, doctor profiles: ${profiles}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.name, error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await disconnectDB();
  });