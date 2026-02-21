const Job = require("../models/Job");

exports.createJob = async (req, res) => {
  try {
    const { title, description, location, jobType, category, specialty, payRate, company, companyWebsite, companyEmail, companyContactPhone } = req.body;

    if (!title || !description || !location || !jobType) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, location, and jobType",
      });
    }

    const validCategories = ["nursing", "allied-health", "therapy", "administrative", "other-healthcare"];
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

    const job = await Job.create(jobData);

    const populated = await Job.findById(job._id).populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create job",
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
      message: error.message || "Failed to fetch jobs",
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
      message: error.message || "Failed to fetch job",
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
      message: error.message || "Failed to delete job",
    });
  }
};
