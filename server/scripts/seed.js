#!/usr/bin/env node
/**
 * Seed script for local dev demo.
 * Creates: owner, company, facility, recruiter membership, sample jobs, candidates, applications, messages.
 * Run: node scripts/seed.js (from server directory) or npm run seed:full
 * Requires MONGODB_URI in .env.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Facility = require("../models/Facility");
const RecruiterMembership = require("../models/RecruiterMembership");
const Job = require("../models/Job");
const Application = require("../models/Application");
const MessageThread = require("../models/MessageThread");
const MessageModel = require("../models/Message");
const SavedJob = require("../models/SavedJob");
const CandidateProfile = require("../models/CandidateProfile");
const CandidateDocument = require("../models/CandidateDocument");
const Testimonial = require("../models/Testimonial");
const { MONGODB_URI, DEFAULT_COMPANY } = require("../config/env");

const SEED_PASSWORD = "Demo123!";

async function seed() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is required. Set it in server/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    let owner = await User.findOne({ email: "owner@demo.com" });
    if (!owner) {
      owner = await User.create({
        name: "Demo Owner",
        email: "owner@demo.com",
        password: SEED_PASSWORD,
        role: "owner",
      });
      console.log("Created owner:", owner.email);
    }

    let recruiter = await User.findOne({ email: "recruiter@demo.com" });
    if (!recruiter) {
      recruiter = await User.create({
        name: "Demo Recruiter",
        email: "recruiter@demo.com",
        password: SEED_PASSWORD,
        role: "recruiter",
      });
      console.log("Created recruiter:", recruiter.email);
    }

    let candidate1 = await User.findOne({ email: "candidate@demo.com" });
    if (!candidate1) {
      candidate1 = await User.create({
        name: "Jane Candidate",
        email: "candidate@demo.com",
        password: SEED_PASSWORD,
        role: "applicant",
      });
      console.log("Created candidate:", candidate1.email);
    }

    let company = await Company.findOne({ ownerId: owner._id });
    if (!company) {
      company = await Company.create({
        name: DEFAULT_COMPANY || "Open Window Staffing",
        legalName: "Open Window Staffing LLC",
        ownerId: owner._id,
        status: "active",
      });
      console.log("Created company:", company.name);
    }

    let facility = await Facility.findOne({ companyId: company._id });
    if (!facility) {
      facility = await Facility.create({
        companyId: company._id,
        name: "Demo Medical Center",
        departments: ["Med/Surg", "ICU", "ER"],
        status: "active",
      });
      console.log("Created facility:", facility.name);
    }

    let membership = await RecruiterMembership.findOne({ userId: recruiter._id, companyId: company._id });
    if (!membership) {
      await RecruiterMembership.create({
        userId: recruiter._id,
        companyId: company._id,
        role: "recruiter",
        status: "active",
      });
      console.log("Created recruiter membership");
    }

    const jobsData = [
      { title: "Travel RN - Med/Surg", location: "Baltimore, MD", jobType: "travel", category: "nursing", payRate: "$2,400/week" },
      { title: "Physical Therapist", location: "Houston, TX", jobType: "full-time", category: "therapy", payRate: "$45-55/hr" },
      { title: "Medical Technologist", location: "Phoenix, AZ", jobType: "contract", category: "allied-health", payRate: "$35-42/hr" },
    ];

    const createdJobs = [];
    for (const j of jobsData) {
      const exists = await Job.findOne({ title: j.title });
      if (!exists) {
        const job = await Job.create({
          ...j,
          description: `Sample job: ${j.title}. Competitive pay and benefits.`,
          company: company.name,
          companyId: company._id,
          facilityId: facility._id,
          createdBy: owner._id,
          status: "open",
        });
        createdJobs.push(job);
        console.log("Created job:", job.title);
      }
    }

    const jobs = createdJobs.length > 0 ? createdJobs : await Job.find({ companyId: company._id }).limit(3);
    let firstJob = jobs[0];
    if (firstJob) {
      const jobId = firstJob._id;
      const existingApp = await Application.findOne({ jobId, applicant: candidate1._id });
      if (!existingApp) {
        await Application.create({
          jobId,
          companyId: company._id,
          facilityId: facility._id,
          applicant: candidate1._id,
          firstName: "Jane",
          lastName: "Candidate",
          email: candidate1.email,
          phone: "555-0100",
          status: "applied",
        });
        console.log("Created application for", firstJob.title);
      }

      const savedExists = await SavedJob.findOne({ userId: candidate1._id, jobId: firstJob._id });
      if (!savedExists) {
        await SavedJob.create({ userId: candidate1._id, jobId: firstJob._id });
        console.log("Created saved job");
      }
    }

    const profile = await CandidateProfile.findOne({ userId: candidate1._id });
    if (!profile) {
      await CandidateProfile.create({
        userId: candidate1._id,
        phone: "555-0100",
        specialties: ["Nursing", "Med/Surg"],
        yearsExperience: 5,
        license: { hasLicense: true, licenseNumber: "RN12345", licenseState: "MD" },
      });
      console.log("Created candidate profile");
    }

    const futureDate = new Date("2030-12-31");
    const requiredTypes = ["License", "BLS", "TB", "Background"];
    for (const type of requiredTypes) {
      const exists = await CandidateDocument.findOne({ userId: candidate1._id, type });
      if (!exists) {
        await CandidateDocument.create({
          userId: candidate1._id,
          type,
          fileUrl: "/uploads/placeholder.pdf",
          fileName: `${type.toLowerCase()}.pdf`,
          verifiedStatus: "verified",
          expiresAt: futureDate,
        });
        console.log("Created verified doc:", type);
      }
    }

    const testimonialData = [
      { authorName: "Sarah M.", authorRole: "Travel RN", rating: 5, title: "Best staffing experience", message: "Open Window Staffing made finding my assignment seamless. Professional, responsive, and they really care about their nurses." },
      { authorName: "James K.", authorRole: "Physical Therapist", rating: 5, title: "Highly recommend", message: "I've worked with several agencies. Open Window stands out for their transparency and support throughout the process." },
      { authorName: "Maria L.", authorRole: "Medical Technologist", rating: 4, title: "Great support", message: "The team was always available when I had questions. Placement was quick and the facility was exactly as described." },
    ];
    const existingTestimonials = await Testimonial.countDocuments({ companyId: company._id });
    if (existingTestimonials === 0) {
      for (const t of testimonialData) {
        await Testimonial.create({
          companyId: company._id,
          ...t,
          source: "admin_seed",
          status: "approved",
          approvedAt: new Date(),
          consentToPublish: true,
        });
      }
      console.log("Created", testimonialData.length, "approved testimonials");
    }

    let thread = await MessageThread.findOne({ companyId: company._id });
    if (!thread) {
      const threadJobId = firstJob?._id || null;
      thread = await MessageThread.create({
        companyId: company._id,
        jobId: threadJobId,
        participants: [
          { userId: candidate1._id, role: "candidate" },
          { userId: recruiter._id, role: "recruiter" },
        ],
        subject: "Regarding your application",
      });
      await MessageModel.create({
        threadId: thread._id,
        companyId: company._id,
        senderId: recruiter._id,
        body: "Thanks for applying! We'd like to schedule a call to discuss your experience.",
      });
      console.log("Created message thread");
    }

    console.log("\n=== Seed complete ===");
    console.log("Login credentials (password for all):", SEED_PASSWORD);
    console.log("  Owner:    owner@demo.com");
    console.log("  Recruiter: recruiter@demo.com");
    console.log("  Candidate: candidate@demo.com");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
