const rawCriteria = [
  {
    code: "C1",
    title: "Curriculum Aspects",
    marks: 100,
    fields: [
      field("Programme Name", "text", true),
      field("Academic Year", "select", true, ["2016-17", "2017-18", "2018-19", "2019-20", "2020-21"]),
      field("Course Type", "select", true, ["Core", "Elective", "Practical", "Open", "Audit"]),
      field("New Programme Introduced?", "radio", true, ["Yes", "No"]),
      field("BoS Member Name", "text"),
      field("BoS Nomination Date", "date"),
      field("Field Project Title", "text"),
      field("Internship Organisation", "text"),
      field("Value Added Course Name", "text"),
      field("Course Hours", "number"),
      field("Feedback Collected?", "radio", true, ["Yes", "No"])
    ]
  },
  {
    code: "C2",
    title: "Teaching-Learning & Evaluation",
    marks: 350,
    fields: [
      field("Student Full Name", "text", true),
      field("Roll Number", "text", true),
      field("Category", "select", true, ["General", "OBC", "SC", "ST", "PH"]),
      field("Year of Admission", "select", true, ["2016", "2017", "2018", "2019", "2020", "2021"]),
      field("Faculty Name", "text"),
      field("Designation", "select", false, ["Professor", "Asst. Professor", "Guest Faculty"]),
      field("Highest Qualification", "select", false, ["UG", "PG", "M.Phil", "Ph.D"]),
      field("Number of Publications", "number"),
      field("ICT Tools Used", "text"),
      field("Internal Assessment Marks", "number"),
      field("Pass Percentage", "number"),
      field("Special Strategies for Slow Learners", "textarea")
    ]
  },
  {
    code: "C3",
    title: "Research, Innovations & Extension",
    marks: 110,
    fields: [
      field("Research Project Title", "text"),
      field("Principal Investigator", "text"),
      field("Funding Agency", "text"),
      field("Grant Amount (INR)", "number"),
      field("Project Start Date", "date"),
      field("Project End Date", "date"),
      field("Journal Paper Title", "text"),
      field("Journal Name", "text"),
      field("UGC Listed?", "radio", false, ["Yes", "No"]),
      field("ISSN Number", "text"),
      field("Book / Chapter Title", "text"),
      field("Publisher Name", "text"),
      field("Year of Publication", "select", false, years()),
      field("PhD Scholar Name", "text"),
      field("PhD Awarded Year", "select", false, years()),
      field("Workshop/Seminar Name", "text"),
      field("Event Date", "date"),
      field("Extension Activity Name", "text"),
      field("Number of Students Participated", "number")
    ]
  },
  {
    code: "C4",
    title: "Infrastructure & Learning Resources",
    marks: 100,
    fields: [
      field("Facility Type", "select", true, ["Classroom", "Lab", "Computer Lab", "Research Facility"]),
      field("Room Number / Name", "text", true),
      field("Area (sq. ft.)", "number"),
      field("Seating Capacity", "number"),
      field("Number of Systems", "number"),
      field("Equipment Name", "text"),
      field("Equipment Make & Model", "text"),
      field("Year of Purchase", "select", false, years()),
      field("Cost (INR)", "number")
    ]
  },
  {
    code: "C5",
    title: "Student Support & Progression",
    marks: 140,
    fields: [
      field("Scholarship Name", "text"),
      field("Awarding Body", "text"),
      field("Beneficiary Student Name", "text"),
      field("Category", "select", false, ["SC", "ST", "OBC", "Minority", "Merit"]),
      field("Amount (INR)", "number"),
      field("Academic Year", "select", false, ["2016-17", "2017-18", "2018-19", "2019-20", "2020-21"]),
      field("Placement Company", "text"),
      field("Job Role", "text"),
      field("Package (LPA)", "number"),
      field("Higher Education Institution", "text"),
      field("Programme Pursued", "text"),
      field("Competitive Exam", "select", false, ["NET", "SLET", "GATE", "UPSC", "PSC", "CAT", "GRE", "TOFEL", "GMAT"]),
      field("Exam Year", "select", false, years()),
      field("Rank / Score", "text"),
      field("Award / Medal Name", "text"),
      field("Level", "select", false, ["State", "National", "International"]),
      field("Alumni Event Date", "date")
    ]
  },
  {
    code: "C6",
    title: "Governance, Leadership & Management",
    marks: 100,
    fields: [
      field("FDP Programme Name", "text"),
      field("Organising Institution", "text"),
      field("Duration (Days)", "number"),
      field("Faculty Member Name", "text"),
      field("Date of Attendance", "date"),
      field("PBAS Score", "number"),
      field("Assessment Year", "select", false, years()),
      field("Fund Generation Activity", "text"),
      field("Amount Generated (INR)", "number"),
      field("Source of Funds", "text")
    ]
  },
  {
    code: "C7",
    title: "Institutional Values & Best Practices",
    marks: 100,
    fields: [
      field("Best Practice Title", "text", true),
      field("Objective", "textarea"),
      field("Context", "textarea"),
      field("Practice Description", "textarea"),
      field("Evidence of Success", "textarea"),
      field("Problems Encountered", "textarea"),
      field("Resources Required", "textarea"),
      field("Green Initiative Name", "text"),
      field("Gender Equity Activity", "text"),
      field("Activity Date", "date"),
      field("Disabled-Friendly Feature", "text")
    ]
  }
];

function field(label, type, required = false, options = []) {
  return { key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label, type, required, options };
}

function years() {
  return ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
}

const subCriteria = {
  C1: [
    sub("1.1", "Curricular Planning & Implementation"),
    sub("1.2", "Academic Flexibility"),
    sub("1.3", "Curriculum Enrichment"),
    sub("1.4", "Feedback System")
  ],
  C2: [
    sub("2.1", "Student Enrolment & Profile"),
    sub("2.2", "Catering to Student Diversity"),
    sub("2.3", "Teaching-Learning Process"),
    sub("2.4", "Teacher Quality"),
    sub("2.5", "Evaluation Process & Reforms")
  ],
  C3: [
    sub("3.1", "Resource Mobilisation for Research"),
    sub("3.2", "Innovation Ecosystem"),
    sub("3.3", "Research Publications & Awards"),
    sub("3.4", "Extension Activities"),
    sub("3.5", "Collaboration")
  ],
  C4: [
    sub("4.1", "Physical Facilities"),
    sub("4.2", "Library as a Learning Resource")
  ],
  C5: [
    sub("5.1", "Student Support"),
    sub("5.2", "Student Progression"),
    sub("5.3", "Student Participation & Activities")
  ],
  C6: [
    sub("6.1", "Institutional Vision & Leadership"),
    sub("6.2", "Strategy Development & Deployment"),
    sub("6.3", "Faculty Empowerment & Fund Generation")
  ],
  C7: [
    sub("7.1", "Institutional Values & Social Responsibilities"),
    sub("7.2", "Best Practices")
  ]
};

const fieldSubCriteria = {
  C1: {
    programme_name: "1.1",
    academic_year: "1.1",
    course_type: "1.2",
    new_programme_introduced: "1.1",
    bos_member_name: "1.1",
    bos_nomination_date: "1.1",
    field_project_title: "1.3",
    internship_organisation: "1.3",
    value_added_course_name: "1.4",
    course_hours: "1.4",
    feedback_collected: "1.4"
  },
  C2: {
    student_full_name: "2.1",
    roll_number: "2.1",
    category: "2.1",
    year_of_admission: "2.1",
    faculty_name: "2.2",
    designation: "2.2",
    highest_qualification: "2.4",
    number_of_publications: "2.4",
    ict_tools_used: "2.2",
    internal_assessment_marks: "2.3",
    pass_percentage: "2.5",
    special_strategies_for_slow_learners: "2.2"
  },
  C3: {
    research_project_title: "3.1",
    principal_investigator: "3.1",
    funding_agency: "3.1",
    grant_amount_inr: "3.1",
    project_start_date: "3.1",
    project_end_date: "3.1",
    journal_paper_title: "3.3",
    journal_name: "3.3",
    ugc_listed: "3.3",
    issn_number: "3.3",
    book_chapter_title: "3.3",
    publisher_name: "3.3",
    year_of_publication: "3.3",
    phd_scholar_name: "3.3",
    phd_awarded_year: "3.3",
    workshop_seminar_name: "3.2",
    event_date: "3.2",
    extension_activity_name: "3.4",
    number_of_students_participated: "3.4"
  },
  C4: {
    facility_type: "4.1",
    room_number_name: "4.1",
    area_sq_ft: "4.1",
    seating_capacity: "4.1",
    number_of_systems: "4.1",
    equipment_name: "4.1",
    equipment_make_model: "4.1",
    year_of_purchase: "4.1",
    cost_inr: "4.1"
  },
  C5: {
    scholarship_name: "5.1",
    awarding_body: "5.1",
    beneficiary_student_name: "5.1",
    category: "5.1",
    amount_inr: "5.1",
    academic_year: "5.1",
    placement_company: "5.2",
    job_role: "5.2",
    package_lpa: "5.2",
    higher_education_institution: "5.2",
    programme_pursued: "5.2",
    competitive_exam: "5.2",
    exam_year: "5.2",
    rank_score: "5.2",
    award_medal_name: "5.1",
    level: "5.1",
    alumni_event_date: "5.3"
  },
  C6: {
    fdp_programme_name: "6.1",
    organising_institution: "6.1",
    duration_days: "6.1",
    faculty_member_name: "6.1",
    date_of_attendance: "6.1",
    pbas_score: "6.2",
    assessment_year: "6.2",
    fund_generation_activity: "6.3",
    amount_generated_inr: "6.3",
    source_of_funds: "6.3"
  },
  C7: {
    best_practice_title: "7.2",
    objective: "7.2",
    context: "7.2",
    practice_description: "7.2",
    evidence_of_success: "7.2",
    problems_encountered: "7.2",
    resources_required: "7.2",
    green_initiative_name: "7.1",
    gender_equity_activity: "7.1",
    activity_date: "7.1",
    disabled_friendly_feature: "7.1"
  }
};

function sub(code, title) {
  return { code, title };
}

function withSubCriteria(items) {
  return items.map((criterion) => ({
    ...criterion,
    subCriteria: subCriteria[criterion.code] || [],
    fields: criterion.fields.map((item) => ({
      ...item,
      subCriterion: fieldSubCriteria[criterion.code]?.[item.key] || subCriteria[criterion.code]?.[0]?.code || ""
    }))
  }));
}

export const criteria = withSubCriteria(rawCriteria);
