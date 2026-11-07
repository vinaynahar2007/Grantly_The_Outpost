import type {
  ActivityItem,
  EducationLevel,
  EligibilityRequirements,
  MatchRequirements,
  ScholarProfile,
  Scholarship,
  ScholarshipApplication,
  ScholarshipCategory,
  ScholarshipLocation,
} from "@/types";

function createRelativeIsoDate(
  daysFromToday: number,
  baseDate: Date = new Date(),
): string {
  const target = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + daysFromToday,
    17,
    0,
    0,
  );
  return target.toISOString();
}

export const DEFAULT_SCHOLAR_PROFILE: ScholarProfile = {
  fullName: "Alex Verma",
  email: "alex.verma@iitb.ac.in",
  institution: "Indian Institute of Technology Bombay",
  degreeLevel: "B.Tech Undergraduate",
  fieldOfStudy: "Computer Science & Engineering",
  graduationYear: 2027,
  gpa: "8.9 / 10.0 CGPA",
  annualFamilyIncome: "",
  leadershipSummary: "",
  // Phase 4 analysis fields. Blank values mean "not provided" — the matcher
  // reports them as missing information and never assumes a value.
  age: null,
  state: "Maharashtra",
  country: "India",
  nationality: "",
  institutionType: "Government",
  academicYear: 3,
  socialCategory: "",
  achievements: "",
  researchInterests: "",
  financialBackground: "",
};

/**
 * Scholarship-specific rules for the Smart Eligibility Matcher (Phase 4).
 * Kept beside the single source of scholarship truth so no record is ever
 * duplicated. Only the extra rules a scholarship actually states are listed;
 * everything else is derived from the record itself.
 */
type MatchRuleOverride = Partial<
  Omit<MatchRequirements, "minGpa" | "courseKeywords" | "evidenceFields">
>;

const MATCH_RULE_OVERRIDES: Record<string, MatchRuleOverride> = {
  "demo-sch-01": {
    minAge: 17,
    maxAge: 25,
    preferredAchievementKeywords: ["research", "project", "publication"],
  },
  "demo-sch-02": {
    maxAnnualIncome: 800000,
    academicYears: [2, 3],
    institutionTypes: ["Government", "Government-Aided", "Private"],
  },
  "demo-sch-03": {
    preferredResearchKeywords: [
      "machine learning",
      "artificial intelligence",
      "open source",
      "ai",
    ],
  },
  "demo-sch-04": {
    preferredAchievementKeywords: [
      "mentor",
      "volunteer",
      "club",
      "leadership",
      "community",
    ],
  },
  "demo-sch-05": {
    preferredAchievementKeywords: [
      "project",
      "prototype",
      "hackathon",
      "research",
    ],
  },
  "demo-sch-07": {
    preferredResearchKeywords: [
      "paper",
      "conference",
      "publication",
      "research",
    ],
  },
  "demo-sch-08": {
    preferredCourseKeywords: ["civic tech", "public policy", "design"],
    preferredAchievementKeywords: ["civic", "community", "volunteer"],
  },
  "demo-sch-09": {
    institutionTypes: ["Government", "Deemed University"],
  },
  "demo-sch-10": {
    minAge: 21,
    preferredResearchKeywords: ["research", "lab", "publication"],
  },
  "demo-sch-11": {
    maxAnnualIncome: 250000,
    allowedStates: ["Maharashtra", "Karnataka", "Goa"],
  },
  "demo-sch-12": {
    allowedStates: ["Maharashtra"],
    minAge: 14,
    maxAge: 19,
  },
};

/** Derives the complete matcher requirement set for one scholarship record. */
function buildMatchRequirements(seed: ScholarshipSeed): MatchRequirements {
  const override = MATCH_RULE_OVERRIDES[seed.id] ?? {};
  return {
    minGpa: seed.eligibilityRequirements.minGpa,
    maxAnnualIncome: override.maxAnnualIncome,
    minAge: override.minAge,
    maxAge: override.maxAge,
    // A National award implies domicile; an International award implies a
    // nationality declaration. Both are stated openly in the breakdown.
    allowedCountries:
      override.allowedCountries ??
      (seed.location === "National" ? ["India"] : []),
    allowedStates: override.allowedStates ?? [],
    allowedNationalities:
      override.allowedNationalities ??
      (seed.location === "International" ? ["Indian"] : []),
    institutionTypes: override.institutionTypes ?? [],
    academicYears: override.academicYears ?? [],
    socialCategories: override.socialCategories ?? [],
    courseKeywords: seed.eligibilityRequirements.acceptedFieldKeywords,
    preferredCourseKeywords: override.preferredCourseKeywords ?? [],
    preferredAchievementKeywords: override.preferredAchievementKeywords ?? [],
    preferredResearchKeywords: override.preferredResearchKeywords ?? [],
    evidenceFields: seed.eligibilityRequirements.requiredProfileFields,
  };
}

interface ScholarshipSeed {
  id: string;
  title: string;
  provider: string;
  providerDescription?: string;
  description?: string;
  amountMin: number;
  amountMax: number;
  deadlineInDays: number;
  dateAddedInDays: number;
  educationLevels: EducationLevel[];
  location: ScholarshipLocation;
  matchScore: number;
  category: ScholarshipCategory;
  eligibilitySummary: string;
  eligibilityCriteria: string[];
  eligibilityRequirements: EligibilityRequirements;
  academicRequirements?: string[];
  financialRequirements?: string[];
  requiredDocuments: string[];
  benefits?: string[];
  applicationSteps?: string[];
  keywords: string[];
  renewable: boolean;
  tags: string[];
}

/**
 * Builds a complete typed Scholarship record from a compact seed, deriving
 * the shared detail-view fields (benefits, steps, important dates) so the
 * dataset stays centralized and never duplicated across components.
 * All records are demonstration data (officialUrl is always null — no
 * external destination is ever invented).
 */
function buildScholarship(seed: ScholarshipSeed, baseDate: Date): Scholarship {
  const deadline = createRelativeIsoDate(seed.deadlineInDays, baseDate);
  const dateAdded = createRelativeIsoDate(seed.dateAddedInDays, baseDate);
  const educationLevel = seed.educationLevels.join(" / ");

  return {
    id: seed.id,
    title: seed.title,
    provider: seed.provider,
    providerDescription:
      seed.providerDescription ??
      `${seed.provider} is shown as a demonstration provider profile inside GRANTLY. Provider details are sample content for product evaluation and are not a verified organisation listing.`,
    description:
      seed.description ??
      `${seed.eligibilitySummary} This demonstration record illustrates how GRANTLY presents award value, deadlines, eligibility and document checklists before a student commits to an application.`,
    amount: seed.amountMax,
    amountMin: seed.amountMin,
    amountMax: seed.amountMax,
    currency: "INR",
    deadline,
    educationLevel,
    educationLevels: seed.educationLevels,
    location: seed.location,
    matchScore: seed.matchScore,
    category: seed.category,
    eligibilitySummary: seed.eligibilitySummary,
    eligibilityCriteria: seed.eligibilityCriteria,
    eligibilityRequirements: seed.eligibilityRequirements,
    matchRequirements: buildMatchRequirements(seed),
    academicRequirements: seed.academicRequirements ?? seed.eligibilityCriteria,
    financialRequirements: seed.financialRequirements ?? [
      "No household-income ceiling is stated for this demonstration record.",
    ],
    requiredDocuments: seed.requiredDocuments,
    benefits: seed.benefits ?? [
      "Direct award disbursement towards tuition and academic expenses",
      seed.renewable
        ? "Renewable in the following academic year subject to continued eligibility"
        : "One-time award for the current application cycle",
      "Mentorship and scholar-community access from the provider",
    ],
    applicationSteps: seed.applicationSteps ?? [
      "Review the eligibility criteria and confirm your profile information is complete.",
      "Save this scholarship and add it to your application tracker in GRANTLY.",
      "Prepare every document listed in the required documents checklist.",
      "Complete the provider application form and submit before the deadline.",
      "Track review updates from your GRANTLY Applications workspace.",
    ],
    officialUrl: null,
    importantDates: [
      { label: "Application deadline", date: deadline },
      { label: "Demonstration record added", date: dateAdded },
    ],
    dateAdded,
    keywords: seed.keywords,
    renewable: seed.renewable,
    tags: seed.tags,
    isDemo: true,
  };
}

export function createDemoScholarships(
  baseDate: Date = new Date(),
): Scholarship[] {
  const seeds: ScholarshipSeed[] = [
    {
      id: "demo-sch-01",
      title: "Aarohan STEM Excellence Fellowship",
      provider: "Aarohan Foundation for Higher Education",
      amountMin: 100000,
      amountMax: 150000,
      deadlineInDays: 4,
      dateAddedInDays: -2,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 96,
      category: "Merit-Based",
      eligibilitySummary:
        "Full-time undergraduate students in engineering or computer science with a cumulative CGPA of 8.0 or above.",
      eligibilityCriteria: [
        "Enrolled in an accredited B.Tech / B.E. / B.Sc. STEM program",
        "Minimum cumulative CGPA of 8.0 / 10.0 or 80% equivalent",
        "Demonstrated technical project or undergraduate research experience",
      ],
      eligibilityRequirements: {
        minGpa: 8.0,
        acceptedFieldKeywords: ["computer", "engineering", "stem", "science"],
        requiredProfileFields: ["leadershipSummary"],
      },
      requiredDocuments: [
        "Official Semester Transcripts",
        "Statement of Purpose (600 words)",
        "One Faculty Recommendation Letter",
      ],
      benefits: [
        "₹1,50,000 annual fellowship towards tuition and research expenses",
        "Renewable each year subject to maintaining a CGPA of 8.0 or above",
        "Access to the Aarohan national STEM scholar network",
      ],
      keywords: [
        "stem",
        "engineering",
        "computer science",
        "fellowship",
        "merit",
        "research",
      ],
      renewable: true,
      tags: ["STEM", "Merit-Based", "Renewable"],
    },
    {
      id: "demo-sch-02",
      title: "Navodaya National Scholars Grant",
      provider: "Navodaya Academic Trust",
      amountMin: 90000,
      amountMax: 125000,
      deadlineInDays: 11,
      dateAddedInDays: -9,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 93,
      category: "Need-Based",
      eligibilitySummary:
        "Supports high-achieving undergraduate scholars balancing strong academic standing with financial need.",
      eligibilityCriteria: [
        "Full-time undergraduate student in 2nd or 3rd year of study",
        "Minimum CGPA of 7.5 / 10.0 across completed semesters",
        "Verified household income certificate",
      ],
      eligibilityRequirements: {
        minGpa: 7.5,
        acceptedFieldKeywords: [],
        requiredProfileFields: ["annualFamilyIncome"],
      },
      financialRequirements: [
        "Annual household income certificate issued by a competent authority",
        "The need-based review considers household income alongside academic merit",
      ],
      requiredDocuments: [
        "Academic Marksheets",
        "Income Verification Document",
        "Personal Financial Impact Essay",
      ],
      keywords: [
        "need-based",
        "merit-cum-means",
        "tuition",
        "undergraduate",
        "grant",
      ],
      renewable: true,
      tags: ["Need-Based", "Tuition Support"],
    },
    {
      id: "demo-sch-03",
      title: "Horizon Computing & AI Innovators Award",
      provider: "Horizon Digital Research Initiative",
      amountMin: 120000,
      amountMax: 120000,
      deadlineInDays: 24,
      dateAddedInDays: -4,
      educationLevels: ["Undergraduate", "Postgraduate"],
      location: "National",
      matchScore: 91,
      category: "Research",
      eligibilitySummary:
        "Recognizes students building open-source tools, applied machine learning systems, or civic technology.",
      eligibilityCriteria: [
        "Open to Computer Science, Data Science, and Electronics majors",
        "Submission of a live repository or technical project abstract",
        "Good academic standing at an accredited university",
      ],
      eligibilityRequirements: {
        acceptedFieldKeywords: [
          "computer",
          "data",
          "electronics",
          "engineering",
        ],
        requiredProfileFields: [],
      },
      requiredDocuments: [
        "Technical Project Portfolio / GitHub Summary",
        "Current Enrollment Certificate",
        "500-word Innovation Statement",
      ],
      benefits: [
        "₹1,20,000 innovation award for project development",
        "Showcase opportunity at the Horizon annual research summit",
        "Mentorship from applied-AI practitioners",
      ],
      keywords: [
        "ai",
        "computing",
        "machine learning",
        "open source",
        "research",
        "innovation",
      ],
      renewable: false,
      tags: ["AI & Computing", "Research"],
    },
    {
      id: "demo-sch-04",
      title: "Pragati First-Generation Leaders Scholarship",
      provider: "Pragati Social Impact Council",
      amountMin: 75000,
      amountMax: 100000,
      deadlineInDays: 36,
      dateAddedInDays: -15,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 88,
      category: "Private",
      eligibilitySummary:
        "Empowers student leaders driving peer mentorship, campus initiatives, and community outreach.",
      eligibilityCriteria: [
        "Enrolled in a full-time bachelor's degree program",
        "Active participation in campus clubs, volunteering, or peer tutoring",
        "Minimum 75% aggregate in prior academic year",
      ],
      eligibilityRequirements: {
        minGpa: 7.5,
        acceptedFieldKeywords: [],
        requiredProfileFields: ["leadershipSummary"],
      },
      requiredDocuments: [
        "Leadership & Community Impact Statement",
        "University ID & Enrollment Proof",
        "Mentor Endorsement Note",
      ],
      keywords: [
        "leadership",
        "first-generation",
        "community",
        "mentorship",
        "private",
      ],
      renewable: true,
      tags: ["Leadership", "Community Impact"],
    },
    {
      id: "demo-sch-05",
      title: "Vidyut Clean Energy & Sustainability Grant",
      provider: "Vidyut Climate & Engineering Consortium",
      amountMin: 100000,
      amountMax: 100000,
      deadlineInDays: 45,
      dateAddedInDays: -21,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 85,
      category: "Private",
      eligibilitySummary:
        "Funds engineering undergraduates exploring energy efficiency, smart grids, and sustainable software.",
      eligibilityCriteria: [
        "2nd, 3rd, or final year engineering undergraduate",
        "Interest in climate tech, optimization, or clean infrastructure",
        "Minimum CGPA of 7.8 / 10.0",
      ],
      eligibilityRequirements: {
        minGpa: 7.8,
        acceptedFieldKeywords: [
          "engineering",
          "computer",
          "energy",
          "electronics",
        ],
        requiredProfileFields: [],
      },
      requiredDocuments: [
        "Proposal Abstract (400 words)",
        "Latest Grade Transcript",
      ],
      keywords: [
        "sustainability",
        "clean energy",
        "climate",
        "engineering",
        "grant",
      ],
      renewable: false,
      tags: ["Sustainability", "Engineering"],
    },
    {
      id: "demo-sch-06",
      title: "Sankalp Academic Merit Bursary",
      provider: "Sankalp Education Endowment",
      amountMin: 60000,
      amountMax: 90000,
      deadlineInDays: 54,
      dateAddedInDays: -6,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 84,
      category: "Merit-Based",
      eligibilitySummary:
        "Annual tuition and textbook stipend awarded to consistent top-decile university performers.",
      eligibilityCriteria: [
        "Consistent academic performance in top 15% of cohort",
        "No disciplinary or academic probation record",
      ],
      eligibilityRequirements: {
        minGpa: 8.0,
        acceptedFieldKeywords: [],
        requiredProfileFields: [],
      },
      requiredDocuments: [
        "Cumulative Grade Card",
        "Brief Academic Goals Statement",
      ],
      benefits: [
        "Up to ₹90,000 towards tuition and textbooks each year",
        "Renewable annually for consistent academic performers",
      ],
      keywords: [
        "merit",
        "bursary",
        "tuition",
        "textbooks",
        "academic excellence",
      ],
      renewable: true,
      tags: ["Tuition Stipend", "Merit-Based"],
    },
    {
      id: "demo-sch-07",
      title: "Kiran Global Exchange & Conference Stipend",
      provider: "Kiran International Scholar Network",
      amountMin: 85000,
      amountMax: 85000,
      deadlineInDays: 63,
      dateAddedInDays: -12,
      educationLevels: ["Undergraduate", "Postgraduate"],
      location: "International",
      matchScore: 81,
      category: "International",
      eligibilitySummary:
        "Covers symposium registration, travel, and accommodation for student authors presenting peer-reviewed work.",
      eligibilityCriteria: [
        "Undergraduate or Master's student at an accredited institution",
        "Draft paper, poster, or workshop submission in progress",
      ],
      eligibilityRequirements: {
        acceptedFieldKeywords: [],
        requiredProfileFields: [],
      },
      requiredDocuments: [
        "Abstract or Research Summary",
        "Advisor Approval Note",
        "Estimated Travel Budget",
      ],
      benefits: [
        "₹85,000 towards conference registration, travel and accommodation",
        "Presentation opportunity within an international scholar network",
      ],
      keywords: [
        "international",
        "conference",
        "travel",
        "research",
        "exchange",
        "global",
      ],
      renewable: false,
      tags: ["International", "Conferences"],
    },
    {
      id: "demo-sch-08",
      title: "Udaan Civic Technology Fellowship",
      provider: "Udaan Public Digital Labs",
      amountMin: 80000,
      amountMax: 80000,
      deadlineInDays: -3,
      dateAddedInDays: -30,
      educationLevels: ["Undergraduate"],
      location: "National",
      matchScore: 79,
      category: "Private",
      eligibilitySummary:
        "Summer fellowship supporting student developers building accessible public-interest digital tools.",
      eligibilityCriteria: [
        "Undergraduate student with software engineering experience",
        "Commitment to open licensing for fellowship deliverables",
      ],
      eligibilityRequirements: {
        acceptedFieldKeywords: ["computer", "software", "engineering"],
        requiredProfileFields: [],
      },
      requiredDocuments: ["Resume / CV", "Code Sample Link"],
      keywords: [
        "civic tech",
        "fellowship",
        "software",
        "public interest",
        "summer",
      ],
      renewable: false,
      tags: ["Civic Tech", "Fellowship"],
    },
    {
      id: "demo-sch-09",
      title: "Bharat Postgraduate Merit Scholarship",
      provider: "National Higher Education Grants Council",
      amountMin: 500000,
      amountMax: 600000,
      deadlineInDays: 72,
      dateAddedInDays: -1,
      educationLevels: ["Postgraduate"],
      location: "National",
      matchScore: 68,
      category: "Government",
      eligibilitySummary:
        "Government merit scholarship for postgraduate students pursuing advanced study at recognised Indian universities.",
      eligibilityCriteria: [
        "Enrolled in a full-time postgraduate (Master's) programme",
        "First-class bachelor's degree with a minimum CGPA of 8.5 / 10.0",
        "Admission offer from a recognised Indian university",
      ],
      eligibilityRequirements: {
        minGpa: 8.5,
        acceptedFieldKeywords: [],
        requiredProfileFields: ["institution"],
      },
      requiredDocuments: [
        "Postgraduate Admission Offer Letter",
        "Bachelor's Degree Transcripts",
        "Statement of Academic Intent",
      ],
      benefits: [
        "₹6,00,000 postgraduate tuition and maintenance award",
        "Government scholar recognition and alumni network access",
      ],
      keywords: ["government", "postgraduate", "masters", "merit", "national"],
      renewable: true,
      tags: ["Government", "Postgraduate"],
    },
    {
      id: "demo-sch-10",
      title: "Global Doctoral Research Fellowship",
      provider: "International Research Exchange Consortium",
      amountMin: 1000000,
      amountMax: 1250000,
      deadlineInDays: 96,
      dateAddedInDays: -3,
      educationLevels: ["Doctoral"],
      location: "International",
      matchScore: 62,
      category: "Research",
      eligibilitySummary:
        "International fellowship supporting doctoral researchers with cross-border collaboration and laboratory placements.",
      eligibilityCriteria: [
        "Enrolled in a recognised PhD / doctoral research programme",
        "Approved research proposal with a named doctoral supervisor",
        "Minimum CGPA of 8.5 / 10.0 in the qualifying Master's degree",
      ],
      eligibilityRequirements: {
        minGpa: 8.5,
        acceptedFieldKeywords: ["computer", "research", "science"],
        requiredProfileFields: ["institution"],
      },
      requiredDocuments: [
        "Approved Doctoral Research Proposal",
        "Supervisor Endorsement Letter",
        "Master's Degree Transcripts",
      ],
      benefits: [
        "₹12,50,000 research fellowship including international placement support",
        "Cross-border laboratory collaboration opportunities",
      ],
      keywords: [
        "doctoral",
        "phd",
        "research",
        "international",
        "fellowship",
        "global",
      ],
      renewable: true,
      tags: ["International", "Doctoral", "Research"],
    },
    {
      id: "demo-sch-11",
      title: "State Skill Diploma Support Bursary",
      provider: "State Technical Education Support Board",
      amountMin: 20000,
      amountMax: 20000,
      deadlineInDays: 115,
      dateAddedInDays: -18,
      educationLevels: ["Diploma"],
      location: "State",
      matchScore: 55,
      category: "Need-Based",
      eligibilitySummary:
        "State bursary helping diploma students from low-income households cover fees, tools and examination costs.",
      eligibilityCriteria: [
        "Enrolled in a recognised polytechnic diploma programme",
        "Verified annual household income below the state threshold",
      ],
      eligibilityRequirements: {
        acceptedFieldKeywords: [],
        requiredProfileFields: ["annualFamilyIncome"],
      },
      financialRequirements: [
        "State-issued household income certificate is mandatory",
        "Priority is given to applicants below the state income threshold",
      ],
      requiredDocuments: [
        "Diploma Enrollment Proof",
        "Income Certificate",
        "Fee Receipt",
      ],
      keywords: [
        "diploma",
        "state",
        "need-based",
        "polytechnic",
        "bursary",
        "skill",
      ],
      renewable: true,
      tags: ["State", "Diploma", "Need-Based"],
    },
    {
      id: "demo-sch-12",
      title: "State School Excellence Scholarship",
      provider: "State School Education Scholarship Trust",
      amountMin: 35000,
      amountMax: 35000,
      deadlineInDays: 140,
      dateAddedInDays: -25,
      educationLevels: ["School"],
      location: "State",
      matchScore: 50,
      category: "Merit-Based",
      eligibilitySummary:
        "State scholarship recognising school students with consistently excellent board examination performance.",
      eligibilityCriteria: [
        "Enrolled in Classes 9–12 at a recognised school",
        "Minimum 85% aggregate in the previous board examination",
      ],
      eligibilityRequirements: {
        minGpa: 8.5,
        acceptedFieldKeywords: [],
        requiredProfileFields: [],
      },
      academicRequirements: [
        "Minimum 85% aggregate in the previous board examination",
        "Enrolled in Classes 9–12 at a recognised school",
      ],
      requiredDocuments: [
        "Previous Year Report Card",
        "School Bonafide Certificate",
      ],
      keywords: ["school", "state", "merit", "board examination", "excellence"],
      renewable: true,
      tags: ["State", "School", "Merit-Based"],
    },
  ];

  return seeds.map((seed) => buildScholarship(seed, baseDate));
}

export const INITIAL_SAVED_SCHOLARSHIP_IDS: string[] = [
  "demo-sch-01",
  "demo-sch-03",
  "demo-sch-04",
];

export function createDemoApplications(
  baseDate: Date = new Date(),
): ScholarshipApplication[] {
  const snapshots = [
    {
      id: "demo-app-01",
      scholarshipId: "demo-sch-01",
      status: "preparing" as const,
      days: -1,
      notes:
        "Statement of purpose drafted; awaiting faculty recommendation upload.",
    },
    {
      id: "demo-app-02",
      scholarshipId: "demo-sch-02",
      status: "preparing" as const,
      days: -2,
      notes: "Transcript attached; finalizing personal impact essay.",
    },
    {
      id: "demo-app-03",
      scholarshipId: "demo-sch-03",
      status: "submitted" as const,
      days: -4,
      notes: "Submitted with open-source project repository link.",
    },
    {
      id: "demo-app-04",
      scholarshipId: "demo-sch-05",
      status: "under-review" as const,
      days: -6,
      notes: "Application cleared initial eligibility screening.",
    },
    {
      id: "demo-app-05",
      scholarshipId: "demo-sch-06",
      status: "awarded" as const,
      days: -12,
      notes: "Selected for annual academic merit bursary.",
    },
  ];
  // Existing demo snapshots have no recorded event history or submission dates.
  return snapshots.map(({ days, ...record }) => ({
    ...record,
    createdAt: null,
    updatedAt: createRelativeIsoDate(days, baseDate),
    submittedAt: null,
    reminderDate: null,
    completedDocuments: [],
    history: [],
  }));
}

export function createDemoActivities(
  baseDate: Date = new Date(),
): ActivityItem[] {
  return [
    {
      id: "demo-act-01",
      type: "scholarship_saved",
      title: "Scholarship saved to shortlist",
      description: "Bookmarked Aarohan STEM Excellence Fellowship (₹1,50,000).",
      timestamp: createRelativeIsoDate(0, baseDate),
      isDemo: true,
    },
    {
      id: "demo-act-02",
      type: "application_status_changed",
      title: "Application moved to Under Review",
      description:
        "Vidyut Clean Energy & Sustainability Grant passed initial screening.",
      timestamp: createRelativeIsoDate(-2, baseDate),
      isDemo: true,
    },
    {
      id: "demo-act-03",
      type: "document_uploaded",
      title: "Document added to vault",
      description:
        "Uploaded Semester_5_Official_Transcript.pdf to Document Vault.",
      timestamp: createRelativeIsoDate(-4, baseDate),
      isDemo: true,
    },
    {
      id: "demo-act-04",
      type: "profile_updated",
      title: "Academic standing updated",
      description: "Updated cumulative CGPA to 8.9 / 10.0 on Scholar Profile.",
      timestamp: createRelativeIsoDate(-6, baseDate),
      isDemo: true,
    },
  ];
}
