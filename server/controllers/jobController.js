const Job = require("../models/Job");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

exports.createJob = async (req, res) => {
  try {
    const { title, description, location, jobType, category, specialty, payRate, company, companyWebsite, companyEmail, companyContactPhone, shift, salary, employmentType } = req.body;

    if (!title || !description || !location || !jobType) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, location, and jobType",
      });
    }

    const validCategories = ["RN", "LPN", "CNA", "nursing", "allied-health", "therapy", "travel-nursing", "administrative", "physician-provider", "behavioral-health", "pharmacy", "diagnostic-imaging", "home-health", "leadership", "other-healthcare"];
    const jobCategory = validCategories.includes(category) ? category : "other-healthcare";

    const validJobTypes = ["full-time", "part-time", "contract", "travel"];
    if (!validJobTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message: "jobType must be one of: full-time, part-time, contract, travel",
      });
    }

    const jobData = {
      title,
      description,
      location,
      jobType,
      category: jobCategory,
      createdBy: req.user._id,
    };
    if (specialty !== undefined) jobData.specialty = specialty;
    if (payRate !== undefined) jobData.payRate = payRate;
    if (company !== undefined) jobData.company = company;
    if (companyWebsite !== undefined) jobData.companyWebsite = companyWebsite;
    if (companyEmail !== undefined) jobData.companyEmail = companyEmail;
    if (companyContactPhone !== undefined) jobData.companyContactPhone = companyContactPhone;
    if (shift !== undefined) jobData.shift = shift;
    if (salary !== undefined) jobData.salary = salary;
    if (employmentType !== undefined) jobData.employmentType = employmentType;

    const job = await Job.create(jobData);

    const populated = await Job.findById(job._id).populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create job"),
    });
  }
};

const NON_HEALTHCARE_TITLES = /software engineer|data scientist|web developer|frontend developer|backend developer|devops|product manager|project manager|designer|graphic designer|marketing manager|sales manager/i;

exports.getAllJobs = async (req, res) => {
  try {
    let jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    jobs = jobs.filter((job) => !NON_HEALTHCARE_TITLES.test(job.title || ""));

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch jobs"),
    });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("createdBy", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch job"),
    });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this job",
      });
    }
    const { title, description, location, jobType, category, specialty, payRate, company } = req.body;
    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (location !== undefined) job.location = location;
    if (jobType !== undefined) job.jobType = jobType;
    if (category !== undefined) job.category = category;
    if (specialty !== undefined) job.specialty = specialty;
    if (payRate !== undefined) job.payRate = payRate;
    if (company !== undefined) job.company = company;
    await job.save();
    const populated = await Job.findById(job._id).populate("createdBy", "name email");
    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update job"),
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this job",
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      data: null,
      message: "Job deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to delete job"),
    });
  }
};
