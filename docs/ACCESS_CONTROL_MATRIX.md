# Access Control Matrix – Open Window Staffing (PR 8B.5)

All routes require auth unless noted. Tenant scope = companyId or userId. No cross-company reads/writes.

| Route Group | Endpoint Pattern | Required Role | Tenant Scope |
|-------------|------------------|--------------|--------------|
| **authRoutes** | POST /login, /register, etc. | none | — |
| **securityRoutes** | GET /csrf | none | — |
| **jobRoutes** | GET / | none (public) | — |
| **jobRoutes** | GET /:id | none (public) | — |
| **jobRoutes** | POST /, PUT /:id, DELETE /:id | recruiter, owner | createdBy OR companyId via hasCompanyAccess |
| **jobRoutes** | GET /my | recruiter, owner | createdBy + getAccessibleCompanyIds |
| **applicationRoutes** | POST /submit, POST / | applicant | applicant = req.user, companyId from job |
| **applicationRoutes** | GET /my, /my-stats, /check/:jobId | applicant | applicant = req.user |
| **applicationRoutes** | PATCH /:id/withdraw | applicant | applicant = req.user (404 if other) |
| **applicationRoutes** | GET /:id/resume | auth | applicant: owner/email; staff: hasCompanyAccess(app.companyId) |
| **applicationRoutes** | GET /recruiter, /job/:jobId, /job/:jobId/export | recruiter, owner | companyId via job/app, hasCompanyAccess |
| **applicationRoutes** | GET /export.csv | recruiter, owner | companyId validated or getAccessibleCompanyIds |
| **applicationRoutes** | PATCH /:id/status | recruiter, owner | canAccessApplication (job/company) |
| **recruiterApplicationRoutes** | GET /applications, PATCH /:id/status, POST /:id/notes | recruiter, owner | applicationService.canAccessApplication |
| **recruiterApplicationRoutes** | GET /jobs/:jobId/applicants | recruiter, owner | applicationService.getApplicantsForJob (hasCompanyAccess) |
| **recruiterApplicationRoutes** | GET /candidates, /candidates/:candidateId | recruiter, owner | getAccessibleCandidateIds |
| **recruiterApplicationRoutes** | GET /compliance | recruiter, owner | companyId validated |
| **candidateRoutes** | GET /me, PUT /me, POST /me/documents | applicant | userId = req.user._id |
| **candidateRoutes** | GET /:id/compliance, POST /:id/compliance/review | recruiter, owner | companyId + getAccessibleCandidateIds |
| **documentRoutes** | GET /:docId/download | auth | owner: doc.userId; staff: getAccessibleCandidateIds |
| **documentRoutes** | PATCH /:docId/verify | recruiter, owner | getAccessibleCandidateIds(doc.userId) |
| **documentRoutes** | DELETE /:docId | applicant | doc.userId = req.user._id |
| **messageRoutes** | GET /start-options, POST /threads, GET /threads | auth | applicant: own apps; staff: getAccessibleCompanyIds |
| **messageRoutes** | GET /threads/:threadId, POST /:threadId/messages, PATCH /:threadId/read | auth | participant OR hasCompanyAccess(thread.companyId) |
| **companyRoutes** | GET /, POST / | recruiter, owner | getAccessibleCompanyIds |
| **companyRoutes** | GET /:id, PATCH /:id | recruiter, owner | hasCompanyAccess(params.id) |
| **facilityRoutes** | POST /, GET /, PATCH /:id | recruiter, owner | companyId validated via hasCompanyAccess |
| **inviteRoutes** | POST /, GET / | owner or recruiter | requireCompanyAccess(body/query) |
| **offerRoutes** | GET /me | applicant | candidateId = req.user._id |
| **offerRoutes** | POST /, GET /, PATCH /:id/send, /withdraw | staff | ensureCompanyAccess(offer.companyId) |
| **offerRoutes** | GET /:id, PATCH /:id/accept, /decline | applicant or staff | applicant: candidateId; staff: companyAccess |
| **contractRoutes** | GET /me | applicant | candidateId via offer |
| **contractRoutes** | POST /, GET /, PATCH /:id/* | staff | companyId validated |
| **contractRoutes** | GET /:id, POST /:id/sign, /download | applicant or staff | applicant: candidateId; staff: companyAccess |
| **timesheetRoutes** | GET /me, POST / | applicant | assignment.candidateId = req.user._id |
| **timesheetRoutes** | GET /, PATCH /:id/approve, /reject | recruiter, owner | companyId in getAccessibleCompanyIds |
| **invoiceRoutes** | POST /request, /generate, GET /, PATCH /:id | recruiter, owner | hasCompanyAccess(companyId) |
| **reportRoutes** | GET /listings, /export | recruiter, owner | getAccessibleCompanyIds |
| **testimonialRoutes** | POST /submit | none | companyId from public list (no auth) |
| **testimonialRoutes** | GET /, GET /admin, PATCH /:id/approve | recruiter, owner | hasCompanyAccess(companyId) |
| **newsletterRoutes** | POST /subscribe | none (rate limited) | — |
| **contactRoutes** | POST / | none (rate limited) | — |
| **adminRoutes** | GET /companies, /system | platformAdmin only | — |
| **staffingRequestRoutes** | POST /, GET / | recruiter, owner | companyId validated |
| **savedJobRoutes** | GET /, POST /, DELETE / | applicant | userId = req.user._id |
| **jobAlertRoutes** | POST /subscribe | auth | — |
| **assignmentRoutes** | GET /me | applicant | candidateId = req.user._id |
| **assignmentRoutes** | POST /, GET /, PATCH /:id/* | recruiter, owner | companyAccess via application/job |
| **onboardingRoutes** | GET /, PATCH /step | auth | role-based (employer vs candidate) |
| **activityRoutes** | GET / | recruiter, owner | companyId in getAccessibleCompanyIds |
| **notificationRoutes** | GET /, PATCH /:id/read | auth | userId = req.user._id |
