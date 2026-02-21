const Application = require("../models/Application");
const Job = require("../models/Job");

exports.createApplication = async (req, res) => {
  try {
    const { jobId, coverMessage } = req.body;
    const applicantId = req.user._id;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    if (req.user.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidates can apply to jobs",
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const existing = await Application.findOne({ job: jobId, applicant: applicantId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    const application = await Application.create({
      job: jobId,
      applicant: applicantId,
      coverMessage: coverMessage || "",
    });

    const populated = await Application.findById(application._id)
      .populate("job", "title company location")
      .populate("applicant", "name email");

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit application",
    });
  }
};

exports.getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applications for this job",
      });
    }

    const applications = await Application.find({ job: jobId })
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch applications",
    });
  }
};

exports.checkApplied = async (req, res) => {
  try {
    const { jobId } = req.params;
    const existing = await Application.findOne({ job: jobId, applicant: req.user._id });
    return res.status(200).json({
      success: true,
      applied: !!existing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check application status",
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidates can view their applications",
      });
    }

    const applications = await Application.find({ applicant: req.user._id })
      .populate("job", "title company location jobType payRate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch applications",
    });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can view their posted jobs",
      });
    }

    const jobs = await Job.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ job: job._id });
        return {
          ...job.toObject(),
          applicationCount: count,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: jobsWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch jobs",
    });
  }
};
