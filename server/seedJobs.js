require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("./models/Job");
const User = require("./models/User");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/openwindow";

const healthcareJobs = [
  { title: "Travel Registered Nurse", location: "Baltimore, MD", jobType: "travel", payRate: "$2,400/week", category: "nursing", description: "Seeking experienced RN for 13-week travel assignment. Competitive pay, housing stipend, and benefits.", company: "Open Window Staffing" },
  { title: "Physical Therapist", location: "Houston, TX", jobType: "full-time", payRate: "$45–55/hr", category: "therapy", description: "Full-time PT position in acute care. New grads welcome. Sign-on bonus available.", company: "Open Window Staffing" },
  { title: "Medical Technologist", location: "Phoenix, AZ", jobType: "contract", payRate: "$35–42/hr", category: "allied-health", description: "Contract MT position. Lab experience required. ASCP preferred.", company: "Open Window Staffing" },
  { title: "Licensed Practical Nurse", location: "Chicago, IL", jobType: "part-time", payRate: "$28–32/hr", category: "nursing", description: "Part-time LPN for skilled nursing facility. Flexible schedule.", company: "Open Window Staffing" },
  { title: "Occupational Therapist", location: "Denver, CO", jobType: "full-time", payRate: "$42–50/hr", category: "therapy", description: "OT for outpatient rehab. Pediatrics or adult population.", company: "Open Window Staffing" },
  { title: "Radiologic Technologist", location: "Miami, FL", jobType: "full-time", payRate: "$32–38/hr", category: "allied-health", description: "RT for hospital imaging department. ARRT required.", company: "Open Window Staffing" },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    const recruiter = await User.findOne({ role: "recruiter" });
    if (!recruiter) {
      console.log("No recruiter found. Create a recruiter account first, then run: node seedJobs.js");
      process.exit(1);
    }

    const existing = await Job.countDocuments();
    const toAdd = healthcareJobs.filter((j) => !existing);
    if (toAdd.length === 0 && existing > 0) {
      console.log("Adding sample healthcare jobs...");
    }

    for (const j of healthcareJobs) {
      const exists = await Job.findOne({ title: j.title, location: j.location });
      if (!exists) {
        await Job.create({ ...j, createdBy: recruiter._id });
        console.log("Added:", j.title);
      }
    }

    const deleted = await Job.deleteMany({
      $or: [
        { title: { $regex: /Software Engineer/i } },
        { title: { $regex: /Data Scientist/i } },
        { title: { $regex: /UX\/UI Designer/i } },
        { title: { $regex: /Marketing Manager/i } },
        { title: { $regex: /Product Manager/i } },
      ],
    });
    if (deleted.deletedCount > 0) {
      console.log("Removed", deleted.deletedCount, "non-healthcare job(s)");
    }

    console.log("Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
