import { supabase } from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// COURSE CATEGORIES  (all 500+ courses from the master list)
// Each category has a label, icon, and flat array of course keys/labels.
// ─────────────────────────────────────────────────────────────────────────────

export interface CourseEntry {
  key: string;   // slug used in DB  (snake_case, max 40 chars)
  label: string; // display name
}

export interface CourseCategory {
  category: string;
  icon: string;
  courses: CourseEntry[];
}

export const COURSE_CATEGORIES: CourseCategory[] = [
  {
    category: "Engineering & Technology",
    icon: "⚙️",
    courses: [
      { key: "mech_eng",          label: "Mechanical Engineering" },
      { key: "civil_eng",         label: "Civil Engineering" },
      { key: "cse",               label: "Computer Science Engineering" },
      { key: "it_eng",            label: "Information Technology" },
      { key: "ai_ml_eng",         label: "Artificial Intelligence & ML" },
      { key: "data_science_eng",  label: "Data Science" },
      { key: "cyber_sec_eng",     label: "Cyber Security" },
      { key: "ece",               label: "Electronics & Communication" },
      { key: "eee",               label: "Electrical & Electronics" },
      { key: "electrical_eng",    label: "Electrical Engineering" },
      { key: "automobile_eng",    label: "Automobile Engineering" },
      { key: "aeronautical_eng",  label: "Aeronautical Engineering" },
      { key: "aerospace_eng",     label: "Aerospace Engineering" },
      { key: "robotics_eng",      label: "Robotics Engineering" },
      { key: "mechatronics",      label: "Mechatronics" },
      { key: "biotech_eng",       label: "Biotechnology Engineering" },
      { key: "biomedical_eng",    label: "Biomedical Engineering" },
      { key: "chemical_eng",      label: "Chemical Engineering" },
      { key: "petroleum_eng",     label: "Petroleum Engineering" },
      { key: "mining_eng",        label: "Mining Engineering" },
      { key: "marine_eng",        label: "Marine Engineering" },
      { key: "agricultural_eng",  label: "Agricultural Engineering" },
      { key: "environmental_eng", label: "Environmental Engineering" },
      { key: "industrial_eng",    label: "Industrial Engineering" },
      { key: "production_eng",    label: "Production Engineering" },
      { key: "textile_tech",      label: "Textile Technology" },
      { key: "food_tech",         label: "Food Technology" },
      { key: "printing_tech",     label: "Printing Technology" },
      { key: "instrumentation",   label: "Instrumentation Engineering" },
      { key: "structural_eng",    label: "Structural Engineering" },
      { key: "software_eng",      label: "Software Engineering" },
      { key: "iot_eng",           label: "IoT Engineering" },
      { key: "cloud_eng",         label: "Cloud Computing" },
      { key: "blockchain_eng",    label: "Blockchain Technology" },
      { key: "vlsi",              label: "VLSI Design" },
      { key: "embedded_sys",      label: "Embedded Systems" },
      { key: "nanotechnology",    label: "Nanotechnology" },
      { key: "renewable_energy",  label: "Renewable Energy Engineering" },
      { key: "safety_fire_eng",   label: "Safety & Fire Engineering" },
      { key: "construction_eng",  label: "Construction Engineering" },
      { key: "metallurgical_eng", label: "Metallurgical Engineering" },
      { key: "ceramic_tech",      label: "Ceramic Technology" },
      { key: "plastic_eng",       label: "Plastic Engineering" },
      { key: "genetic_eng",       label: "Genetic Engineering" },
      { key: "railway_eng",       label: "Railway Engineering" },
      { key: "smart_mfg",         label: "Smart Manufacturing" },
    ],
  },
  {
    category: "Medical & Health Sciences",
    icon: "🏥",
    courses: [
      { key: "mbbs",              label: "MBBS" },
      { key: "bds",               label: "BDS" },
      { key: "bams",              label: "BAMS" },
      { key: "bhms",              label: "BHMS" },
      { key: "bums",              label: "BUMS" },
      { key: "bsms",              label: "BSMS" },
      { key: "bpt",               label: "BPT (Physiotherapy)" },
      { key: "bot",               label: "BOT (Occupational Therapy)" },
      { key: "bsc_nursing",       label: "B.Sc Nursing" },
      { key: "gnm_nursing",       label: "GNM Nursing" },
      { key: "anm_nursing",       label: "ANM Nursing" },
      { key: "pharm_d",           label: "Pharm D" },
      { key: "b_pharm",           label: "B.Pharm" },
      { key: "d_pharm",           label: "D.Pharm" },
      { key: "mlt",               label: "Medical Laboratory Technology" },
      { key: "radiology",         label: "Radiology" },
      { key: "radiotherapy",      label: "Radiotherapy" },
      { key: "cardiac_tech",      label: "Cardiac Technology" },
      { key: "dialysis_tech",     label: "Dialysis Technology" },
      { key: "optometry",         label: "Optometry" },
      { key: "ot_tech",           label: "Operation Theatre Technology" },
      { key: "physician_asst",    label: "Physician Assistant" },
      { key: "emergency_care",    label: "Emergency Care Technology" },
      { key: "perfusion_tech",    label: "Perfusion Technology" },
      { key: "nutrition_diet",    label: "Nutrition & Dietetics" },
      { key: "public_health",     label: "Public Health" },
      { key: "audiology",         label: "Audiology & Speech Therapy" },
      { key: "respiratory_ther",  label: "Respiratory Therapy" },
      { key: "biomedical_sci",    label: "Biomedical Science" },
      { key: "clinical_psych",    label: "Clinical Psychology" },
      { key: "health_info_mgmt",  label: "Health Information Management" },
      { key: "medical_coding",    label: "Medical Coding" },
      { key: "forensic_med",      label: "Forensic Medicine" },
      { key: "neuro_tech",        label: "Neuro Technology" },
      { key: "dental_hygiene",    label: "Dental Hygiene" },
      { key: "dental_tech",       label: "Dental Technology" },
      { key: "veterinary_sci",    label: "Veterinary Science" },
      { key: "ayurveda",          label: "Ayurveda" },
      { key: "siddha",            label: "Siddha" },
      { key: "unani",             label: "Unani" },
      { key: "homeopathy",        label: "Homeopathy" },
    ],
  },
  {
    category: "Arts & Humanities",
    icon: "🎭",
    courses: [
      { key: "ba_english",        label: "BA English" },
      { key: "ba_tamil",          label: "BA Tamil" },
      { key: "ba_hindi",          label: "BA Hindi" },
      { key: "ba_history",        label: "BA History" },
      { key: "ba_economics",      label: "BA Economics" },
      { key: "ba_polsci",         label: "BA Political Science" },
      { key: "ba_sociology",      label: "BA Sociology" },
      { key: "ba_psychology",     label: "BA Psychology" },
      { key: "ba_philosophy",     label: "BA Philosophy" },
      { key: "ba_journalism",     label: "BA Journalism" },
      { key: "ba_pub_admin",      label: "BA Public Administration" },
      { key: "ba_geography",      label: "BA Geography" },
      { key: "ba_archaeology",    label: "BA Archaeology" },
      { key: "ba_anthropology",   label: "BA Anthropology" },
      { key: "ba_linguistics",    label: "BA Linguistics" },
      { key: "ba_fine_arts",      label: "BA Fine Arts" },
      { key: "ba_music",          label: "BA Music" },
      { key: "ba_dance",          label: "BA Dance" },
      { key: "ba_theatre",        label: "BA Theatre Arts" },
      { key: "ba_film_studies",   label: "BA Film Studies" },
      { key: "ba_criminology",    label: "BA Criminology" },
      { key: "ba_social_work",    label: "BA Social Work" },
      { key: "ba_intl_rel",       label: "BA International Relations" },
      { key: "ba_rural_dev",      label: "BA Rural Development" },
      { key: "ba_human_rights",   label: "BA Human Rights" },
    ],
  },
  {
    category: "Science",
    icon: "🔬",
    courses: [
      { key: "bsc_physics",       label: "B.Sc Physics" },
      { key: "bsc_chemistry",     label: "B.Sc Chemistry" },
      { key: "bsc_maths",         label: "B.Sc Mathematics" },
      { key: "bsc_cs",            label: "B.Sc Computer Science" },
      { key: "bsc_biotech",       label: "B.Sc Biotechnology" },
      { key: "bsc_microbio",      label: "B.Sc Microbiology" },
      { key: "bsc_biochem",       label: "B.Sc Biochemistry" },
      { key: "bsc_zoology",       label: "B.Sc Zoology" },
      { key: "bsc_botany",        label: "B.Sc Botany" },
      { key: "bsc_stats",         label: "B.Sc Statistics" },
      { key: "bsc_ds",            label: "B.Sc Data Science" },
      { key: "bsc_ai",            label: "B.Sc AI" },
      { key: "bsc_cyber",         label: "B.Sc Cyber Security" },
      { key: "bsc_it",            label: "B.Sc Information Technology" },
      { key: "bsc_electronics",   label: "B.Sc Electronics" },
      { key: "bsc_visual_comm",   label: "B.Sc Visual Communication" },
      { key: "bsc_animation",     label: "B.Sc Animation" },
      { key: "bsc_nutrition",     label: "B.Sc Nutrition" },
      { key: "bsc_env_sci",       label: "B.Sc Environmental Science" },
      { key: "bsc_food_sci",      label: "B.Sc Food Science" },
      { key: "bsc_genetics",      label: "B.Sc Genetics" },
      { key: "bsc_nano",          label: "B.Sc Nanotechnology" },
      { key: "bsc_agriculture",   label: "B.Sc Agriculture" },
      { key: "bsc_forestry",      label: "B.Sc Forestry" },
      { key: "bsc_fisheries",     label: "B.Sc Fisheries" },
      { key: "bsc_horticulture",  label: "B.Sc Horticulture" },
    ],
  },
  {
    category: "Commerce & Management",
    icon: "📈",
    courses: [
      { key: "bcom",              label: "B.Com" },
      { key: "bcom_af",           label: "B.Com Accounting & Finance" },
      { key: "bcom_ca",           label: "B.Com CA" },
      { key: "bcom_prof_acc",     label: "B.Com Professional Accounting" },
      { key: "bcom_banking",      label: "B.Com Banking" },
      { key: "bcom_taxation",     label: "B.Com Taxation" },
      { key: "bcom_marketing",    label: "B.Com Marketing" },
      { key: "bba",               label: "BBA" },
      { key: "bbm",               label: "BBM" },
      { key: "mba",               label: "MBA" },
      { key: "retail_mgmt",       label: "Retail Management" },
      { key: "hospital_mgmt",     label: "Hospital Management" },
      { key: "logistics_mgmt",    label: "Logistics Management" },
      { key: "aviation_mgmt",     label: "Aviation Management" },
      { key: "event_mgmt",        label: "Event Management" },
      { key: "hotel_mgmt",        label: "Hotel Management" },
      { key: "hr_mgmt",           label: "HR Management" },
      { key: "finance_mgmt",      label: "Finance Management" },
      { key: "marketing_mgmt",    label: "Marketing Management" },
      { key: "operations_mgmt",   label: "Operations Management" },
      { key: "intl_business",     label: "International Business" },
      { key: "digital_marketing", label: "Digital Marketing" },
      { key: "business_analytics",label: "Business Analytics" },
      { key: "entrepreneurship",  label: "Entrepreneurship" },
      { key: "supply_chain",      label: "Supply Chain Management" },
      { key: "ecommerce",         label: "E-Commerce" },
      { key: "banking_insurance", label: "Banking & Insurance" },
    ],
  },
  {
    category: "Computer & IT",
    icon: "💻",
    courses: [
      { key: "bca",               label: "BCA" },
      { key: "mca",               label: "MCA" },
      { key: "comp_applications", label: "Computer Applications" },
      { key: "fullstack_dev",     label: "Full Stack Development" },
      { key: "software_dev",      label: "Software Development" },
      { key: "web_dev",           label: "Web Development" },
      { key: "mobile_app_dev",    label: "Mobile App Development" },
      { key: "game_dev",          label: "Game Development" },
      { key: "ethical_hacking",   label: "Ethical Hacking" },
      { key: "cloud_computing",   label: "Cloud Computing" },
      { key: "devops",            label: "DevOps" },
      { key: "ai_ml_it",          label: "AI & ML" },
      { key: "prompt_eng",        label: "Prompt Engineering" },
      { key: "ui_ux",             label: "UI/UX Design" },
      { key: "ar_vr",             label: "AR/VR Development" },
      { key: "blockchain_dev",    label: "Blockchain Development" },
      { key: "big_data",          label: "Big Data Analytics" },
      { key: "data_analytics",    label: "Data Analytics" },
      { key: "cyber_forensics",   label: "Cyber Forensics" },
      { key: "networking",        label: "Networking" },
      { key: "sys_admin",         label: "System Administration" },
    ],
  },
  {
    category: "Law",
    icon: "⚖️",
    courses: [
      { key: "llb",               label: "LLB" },
      { key: "ba_llb",            label: "BA LLB" },
      { key: "bba_llb",           label: "BBA LLB" },
      { key: "bcom_llb",          label: "B.Com LLB" },
      { key: "criminal_law",      label: "Criminal Law" },
      { key: "corporate_law",     label: "Corporate Law" },
      { key: "constitutional_law",label: "Constitutional Law" },
      { key: "cyber_law",         label: "Cyber Law" },
      { key: "ip_law",            label: "Intellectual Property Law" },
      { key: "intl_law",          label: "International Law" },
      { key: "human_rights_law",  label: "Human Rights Law" },
      { key: "taxation_law",      label: "Taxation Law" },
      { key: "environmental_law", label: "Environmental Law" },
    ],
  },
  {
    category: "Agriculture & Allied",
    icon: "🌾",
    courses: [
      { key: "bsc_agri",          label: "B.Sc Agriculture" },
      { key: "agri_economics",    label: "Agricultural Economics" },
      { key: "agronomy",          label: "Agronomy" },
      { key: "plant_pathology",   label: "Plant Pathology" },
      { key: "soil_science",      label: "Soil Science" },
      { key: "seed_tech",         label: "Seed Technology" },
      { key: "dairy_tech",        label: "Dairy Technology" },
      { key: "poultry_farming",   label: "Poultry Farming" },
      { key: "sericulture",       label: "Sericulture" },
      { key: "fisheries_sci",     label: "Fisheries Science" },
      { key: "forestry",          label: "Forestry" },
      { key: "horticulture",      label: "Horticulture" },
      { key: "organic_farming",   label: "Organic Farming" },
      { key: "food_processing",   label: "Food Processing" },
    ],
  },
  {
    category: "Design & Fashion",
    icon: "🎨",
    courses: [
      { key: "fashion_design",    label: "Fashion Designing" },
      { key: "interior_design",   label: "Interior Designing" },
      { key: "textile_design",    label: "Textile Designing" },
      { key: "product_design",    label: "Product Designing" },
      { key: "graphic_design",    label: "Graphic Designing" },
      { key: "animation_design",  label: "Animation Design" },
      { key: "jewellery_design",  label: "Jewellery Designing" },
      { key: "ui_ux_design",      label: "UI/UX Design" },
      { key: "comm_design",       label: "Communication Design" },
      { key: "industrial_design", label: "Industrial Design" },
    ],
  },
  {
    category: "Hotel, Aviation & Tourism",
    icon: "✈️",
    courses: [
      { key: "hotel_mgmt_hatt",   label: "Hotel Management" },
      { key: "catering_tech",     label: "Catering Technology" },
      { key: "culinary_arts",     label: "Culinary Arts" },
      { key: "bakery",            label: "Bakery & Confectionery" },
      { key: "aviation_mgmt_hatt",label: "Aviation Management" },
      { key: "cabin_crew",        label: "Cabin Crew Training" },
      { key: "airport_mgmt",      label: "Airport Management" },
      { key: "tourism_mgmt",      label: "Tourism Management" },
      { key: "travel_tourism",    label: "Travel & Tourism" },
    ],
  },
  {
    category: "Media & Communication",
    icon: "📺",
    courses: [
      { key: "journalism",        label: "Journalism" },
      { key: "mass_comm",         label: "Mass Communication" },
      { key: "digital_media",     label: "Digital Media" },
      { key: "film_making",       label: "Film Making" },
      { key: "photography",       label: "Photography" },
      { key: "visual_comm",       label: "Visual Communication" },
      { key: "advertising",       label: "Advertising" },
      { key: "public_relations",  label: "Public Relations" },
      { key: "radio_jockey",      label: "Radio Jockey" },
      { key: "video_editing",     label: "Video Editing" },
      { key: "content_creation",  label: "Content Creation" },
    ],
  },
  {
    category: "Education & Teaching",
    icon: "📚",
    courses: [
      { key: "bed",               label: "B.Ed" },
      { key: "med",               label: "M.Ed" },
      { key: "montessori",        label: "Montessori Training" },
      { key: "physical_edu",      label: "Physical Education" },
      { key: "special_edu",       label: "Special Education" },
      { key: "early_childhood",   label: "Early Childhood Education" },
    ],
  },
  {
    category: "Vocational & Skill",
    icon: "🔧",
    courses: [
      { key: "electrician",       label: "Electrician" },
      { key: "fitter",            label: "Fitter" },
      { key: "welding",           label: "Welding" },
      { key: "cnc_operator",      label: "CNC Operator" },
      { key: "auto_technician",   label: "Automobile Technician" },
      { key: "ac_mechanic",       label: "AC Mechanic" },
      { key: "beautician",        label: "Beautician" },
      { key: "makeup_artist",     label: "Makeup Artist" },
      { key: "fitness_trainer",   label: "Fitness Trainer" },
      { key: "yoga_trainer",      label: "Yoga Trainer" },
      { key: "photography_voc",   label: "Photography" },
      { key: "mobile_repair",     label: "Mobile Repairing" },
      { key: "hardware_net",      label: "Hardware Networking" },
      { key: "fire_safety",       label: "Fire & Safety" },
      { key: "digital_mkt_voc",   label: "Digital Marketing" },
      { key: "medical_coding_voc",label: "Medical Coding" },
    ],
  },
  {
    category: "Maritime & Defense",
    icon: "⚓",
    courses: [
      { key: "nautical_sci",      label: "Nautical Science" },
      { key: "marine_eng_md",     label: "Marine Engineering" },
      { key: "defense_studies",   label: "Defense Studies" },
      { key: "military_sci",      label: "Military Science" },
      { key: "naval_arch",        label: "Naval Architecture" },
    ],
  },
  {
    category: "Emerging & Future",
    icon: "🚀",
    courses: [
      { key: "artificial_intel",  label: "Artificial Intelligence" },
      { key: "machine_learning",  label: "Machine Learning" },
      { key: "quantum_computing", label: "Quantum Computing" },
      { key: "robotics_future",   label: "Robotics" },
      { key: "space_science",     label: "Space Science" },
      { key: "drone_tech",        label: "Drone Technology" },
      { key: "metaverse_dev",     label: "Metaverse Development" },
      { key: "ethical_ai",        label: "Ethical AI" },
      { key: "green_energy_tech", label: "Green Energy Technology" },
      { key: "smart_city_tech",   label: "Smart City Technology" },
      { key: "autonomous_vehicles",label: "Autonomous Vehicles" },
      { key: "bioinformatics",    label: "Bioinformatics" },
      { key: "computational_bio", label: "Computational Biology" },
    ],
  },
];

// ── Flat list for legacy compatibility ────────────────────────────────────────
export const DEPARTMENTS = COURSE_CATEGORIES.flatMap((cat) =>
  cat.courses.map((c) => ({
    key: c.key,
    label: c.label,
    icon: cat.icon,
    category: cat.category,
  }))
);

export function getDepartmentMeta(key: string) {
  return DEPARTMENTS.find((d) => d.key === key) ?? { key, label: key, icon: "📚", category: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// JD TEMPLATES  — a sensible fallback for each category
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_JD: Record<string, string> = {
  "Engineering & Technology": "Engineering role requiring core technical knowledge, problem solving, and domain-specific skills.",
  "Medical & Health Sciences": "Healthcare professional role requiring clinical knowledge, patient care, and medical procedures.",
  "Arts & Humanities": "Humanities role requiring critical thinking, communication, research, and cultural understanding.",
  "Science": "Science role requiring analytical skills, laboratory techniques, and scientific methodology.",
  "Commerce & Management": "Business role requiring financial acumen, management skills, and strategic thinking.",
  "Computer & IT": "IT role requiring programming, system design, software development, and technical problem solving.",
  "Law": "Legal role requiring knowledge of statutes, case law, legal drafting, and court procedures.",
  "Agriculture & Allied": "Agriculture role requiring crop science, farm management, and rural technology.",
  "Design & Fashion": "Design role requiring creativity, visual communication, and design tools.",
  "Hotel, Aviation & Tourism": "Hospitality role requiring customer service, operations, and industry-specific knowledge.",
  "Media & Communication": "Media role requiring content creation, storytelling, and communication skills.",
  "Education & Teaching": "Teaching role requiring pedagogy, curriculum design, and student engagement.",
  "Vocational & Skill": "Skilled trade role requiring hands-on technical expertise and safety awareness.",
  "Maritime & Defense": "Maritime or defense role requiring specialized technical and operational knowledge.",
  "Emerging & Future": "Future technology role requiring innovation, emerging tech knowledge, and adaptability.",
};

const COURSE_JD: Record<string, string> = {
  cse:               "Software Developer requiring data structures, algorithms, OOP, databases, OS, networks, and web development.",
  it_eng:            "IT Professional requiring networking, system administration, cloud services, databases, and cybersecurity fundamentals.",
  ai_ml_eng:         "AI/ML Engineer requiring neural networks, NLP, computer vision, TensorFlow, PyTorch, and AI ethics.",
  data_science_eng:  "Data Scientist requiring statistics, Python/R, SQL, machine learning, and data visualization.",
  cyber_sec_eng:     "Cyber Security Analyst requiring network security, ethical hacking, cryptography, SIEM, and compliance.",
  cloud_eng:         "Cloud Engineer requiring AWS/Azure/GCP, containers, DevOps, IaC, serverless, and cloud security.",
  ece:               "Electronics Engineer requiring digital/analog circuits, VLSI, signal processing, and embedded systems.",
  eee:               "Electrical Engineer requiring power systems, control systems, electrical machines, and power electronics.",
  mech_eng:          "Mechanical Engineer requiring thermodynamics, fluid mechanics, manufacturing, CAD/CAM, and material science.",
  civil_eng:         "Civil Engineer requiring structural analysis, geotechnical engineering, and construction management.",
  robotics_eng:      "Robotics Engineer requiring kinematics, ROS, sensor integration, control systems, and computer vision.",
  iot_eng:           "IoT Developer requiring embedded systems, MQTT, edge computing, microcontrollers, and IoT security.",
  mba:               "Management role requiring strategic management, marketing, finance, HR, and business analytics.",
  bba:               "Business Administration requiring accounting, economics, organizational behavior, and marketing.",
  mbbs:              "Medical professional requiring anatomy, physiology, pharmacology, clinical skills, and patient management.",
  bca:               "Computer Applications professional requiring programming, DBMS, networking, and software development.",
  llb:               "Legal professional requiring civil law, criminal law, constitutional law, and legal drafting.",
  bsc_cs:            "Computer Science graduate requiring algorithms, programming, DBMS, OS, and software engineering.",
};

function getJDForCourse(key: string, category: string): string {
  return COURSE_JD[key] ?? CATEGORY_JD[category] ?? `Professional role in ${key}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ: Get 50 questions from shared library
// ─────────────────────────────────────────────────────────────────────────────
export async function getStudentQuestions(
  _userId: string,
  sector: string,
  level: string
) {
  const { data, error } = await supabase
    .from("library_questions")
    .select("*")
    .eq("department", sector)
    .eq("level", level)
    .limit(50);

  if (error) {
    console.error("[getStudentQuestions] DB error:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  const shuffled = [...data].sort(() => Math.random() - 0.5);

  return shuffled.map((row: any) => ({
    question: row.question,
    options: Array.isArray(row.options) ? row.options : JSON.parse(row.options),
    correct: row.correct,
    skill: row.skill ?? sector,
    explanation: row.explanation ?? "",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK: Library status per dept/level
// ─────────────────────────────────────────────────────────────────────────────
export async function getLibraryStatus() {
  const levels = ["easy", "medium", "hard"];
  const status: Record<string, Record<string, number>> = {};

  for (const dept of DEPARTMENTS) {
    status[dept.key] = {};
    for (const level of levels) {
      const { count } = await supabase
        .from("library_questions")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.key)
        .eq("level", level);
      status[dept.key][level] = count ?? 0;
    }
  }
  return status;
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE: Seed 50 questions for one dept+level  (5 batches × 10)
// ─────────────────────────────────────────────────────────────────────────────
export async function seedDepartmentLevel(
  department: string,
  level: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const meta = getDepartmentMeta(department);
  const jd = getJDForCourse(department, meta.category ?? "");
  const BATCH_SIZE = 10;
  const TOTAL_BATCHES = 5;
  let inserted = 0;

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return { success: false, inserted: 0, error: "VITE_GEMINI_API_KEY not set" };

  for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
    onProgress?.(`Generating batch ${batch + 1}/${TOTAL_BATCHES} for ${department} ${level}...`);

    const prompt = `You are a placement exam question generator.

Generate exactly ${BATCH_SIZE} unique multiple-choice questions at ${level} difficulty for this role:
"${jd}"

Rules:
- Questions must be unique (batch ${batch + 1} of ${TOTAL_BATCHES})
- Each question must have exactly 4 options
- correct index must be 0, 1, 2, or 3 (0=A)
- Include a short skill tag

Respond ONLY with a valid JSON array (no markdown):
[{"question":"...","options":["A","B","C","D"],"correct":0,"skill":"..."}]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!response.ok) { console.error(`Batch ${batch + 1} API error`); continue; }

      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = raw.replace(/```json|```/g, "").trim();

      let questions: any[];
      try { questions = JSON.parse(cleaned); }
      catch { console.error(`Batch ${batch + 1} parse error`); continue; }

      if (!Array.isArray(questions) || questions.length === 0) continue;

      const valid = questions.filter(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct === "number"
      );
      if (valid.length === 0) continue;

      const rows = valid.map((q) => ({
        department,
        level,
        question: q.question,
        options: q.options,
        correct: q.correct,
        skill: q.skill ?? department,
      }));

      const { error: insertError } = await supabase.from("library_questions").insert(rows);
      if (insertError) {
        console.error(`Batch ${batch + 1} insert error:`, insertError.message);
      } else {
        inserted += valid.length;
        onProgress?.(`✅ Batch ${batch + 1} done — ${inserted} questions saved`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`Batch ${batch + 1} failed:`, err.message);
    }
  }

  return {
    success: inserted > 0,
    inserted,
    error: inserted === 0 ? "All batches failed" : undefined,
  };
}

// Legacy shim
export async function initializeStudentQuestions(_userId: string, _sectors?: string[]) {
  console.warn("initializeStudentQuestions is deprecated. Use seedDepartmentLevel() instead.");
  return true;
}