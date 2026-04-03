const specializationMap = {
  Engineering: ["CSE", "ECE", "Mechanical", "Civil", "AI & Data Science"],
  Medical: ["MBBS", "BDS", "Pharmacy", "Nursing", "Physiotherapy"],
  Commerce: ["Accounting", "Finance", "Business Analytics", "Marketing", "Banking"]
};

const dashboardState = {
  query: "",
  highDemandOnly: false,
  salaryMin: 0,
  salaryMax: 50
};

let currentDomainsSnapshot = [];
let selectedDomainName = null;

function round1(x) {
  return Math.round(x * 10) / 10;
}

function parseLpaMidpoint(str) {
  if (!str) return 0;
  const s = String(str);
  const range = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  const plus = s.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (plus) return parseFloat(plus[1]);
  const single = s.match(/(\d+(?:\.\d+)?)/);
  return single ? parseFloat(single[1]) : 0;
}

function expandSalaryBandsFromRange(rangeStr) {
  const m = String(rangeStr).match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (!m) {
    return { salaryBeginner: rangeStr, salaryAverage: rangeStr, salaryHighest: rangeStr };
  }
  const lo = parseFloat(m[1]);
  const hi = parseFloat(m[2]);
  return {
    salaryBeginner: `${round1(Math.max(2, lo * 0.55))}-${round1(lo * 0.95)} LPA`,
    salaryAverage: `${lo}-${hi} LPA`,
    salaryHighest: `${round1(hi * 0.92)}-${round1(hi * 1.42)} LPA`
  };
}

function mapProofToDemand(futureProof) {
  if (!futureProof) return "medium";
  const s = String(futureProof).toLowerCase();
  if (s.includes("very strong")) return "high";
  if (s.includes("emerging")) return "low";
  if (s.includes("moderate") && s.includes("strong")) return "medium";
  if (s.includes("strong")) return "high";
  if (s.includes("moderate")) return "medium";
  return "medium";
}

function normalizeRoleDetail(role, domain) {
  const raw = typeof role === "string" ? { title: role } : role;
  const title = raw.title;
  const salaryAverage = raw.salaryAverage || raw.salary || domain.avgSalary;
  const bands = expandSalaryBandsFromRange(salaryAverage || "N/A");
  return {
    title,
    salaryBeginner: raw.salaryBeginner || bands.salaryBeginner,
    salaryAverage: salaryAverage || bands.salaryAverage,
    salaryHighest: raw.salaryHighest || bands.salaryHighest,
    skills: raw.skills || domain.skills || [],
    demandLevel: raw.demandLevel || mapProofToDemand(domain.futureProof),
    futureDemand: raw.futureDemand || domain.futureProof || "—",
    futureDemandReason:
      raw.futureDemandReason ||
      (domain.demand5Years
        ? `Typical hiring for ${title} aligns with this domain outlook: ${domain.demand5Years}`
        : "Demand follows long-term industry and demographic trends relevant to this specialization.")
  };
}

function normalizeDomainRoles(domain) {
  if (domain.roleDetails && domain.roleDetails.length) {
    return domain.roleDetails.map((r) => normalizeRoleDetail(r, domain));
  }
  return (domain.jobRoles || []).map((r) => normalizeRoleDetail(r, domain));
}

function roleRecommendationScore(role) {
  const level = role.demandLevel || "medium";
  const lr = level === "high" ? 3 : level === "medium" ? 2 : 1;
  const avg = parseLpaMidpoint(role.salaryAverage);
  return lr * 28 + Math.min(avg * 2.2, 36);
}

function filterDomains(domains, state) {
  const q = (state.query || "").trim().toLowerCase();
  return domains
    .map((domain) => {
      const roles = normalizeDomainRoles(domain);
      const matches = roles.filter((role) => {
        if (q && !domain.name.toLowerCase().includes(q) && !role.title.toLowerCase().includes(q)) {
          return false;
        }
        if (state.highDemandOnly && role.demandLevel !== "high") {
          return false;
        }
        const mid = parseLpaMidpoint(role.salaryAverage);
        if (mid < state.salaryMin || mid > state.salaryMax) {
          return false;
        }
        return true;
      });
      return matches.length ? { ...domain, _filteredRoles: matches } : null;
    })
    .filter(Boolean);
}

function getTopRecommendedRoles(domains, n = 5) {
  const scored = [];
  domains.forEach((domain) => {
    normalizeDomainRoles(domain).forEach((role) => {
      scored.push({ domain, role, score: roleRecommendationScore(role) });
    });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

const domainData = {
  Engineering: {
    CSE: [
      {
        name: "Software Development",
        domainSummary: "Build and scale web, mobile, and enterprise products.",
        roleDetails: [
          {
            title: "Frontend Developer",
            salaryAverage: "5-12 LPA",
            demandLevel: "high",
            futureDemandReason: "Web UIs remain central as companies ship AI-assisted features and dashboards.",
            skills: ["HTML/CSS", "JavaScript/TypeScript", "React/Angular", "Performance Optimization", "Testing"]
          },
          {
            title: "Backend Developer",
            salaryAverage: "6-14 LPA",
            demandLevel: "high",
            futureDemandReason: "Server-side engineering scales with APIs, integrations, and data-heavy products.",
            skills: ["Node.js/Java/Python", "APIs", "Databases", "Authentication", "System Design Basics"]
          },
          {
            title: "Full Stack Developer",
            salaryAverage: "7-16 LPA",
            demandLevel: "high",
            futureDemandReason: "Startups and product teams value end-to-end ownership for speed.",
            skills: ["Frontend Frameworks", "Backend APIs", "SQL/NoSQL", "CI/CD", "Cloud Fundamentals"]
          },
          {
            title: "Software Engineer (Generalist)",
            salaryAverage: "6-14 LPA",
            demandLevel: "high",
            futureDemandReason: "Most product roadmaps still need versatile engineers across modules.",
            skills: ["Data Structures", "OOP", "Testing", "Debugging", "Code Review"]
          },
          {
            title: "Mobile Developer (Native)",
            salaryAverage: "6-14 LPA",
            demandLevel: "high",
            futureDemandReason: "Mobile-first usage keeps demand for Android/iOS engineers steady.",
            skills: ["Kotlin/Swift", "App Lifecycle", "Offline", "Push", "Store Releases"]
          },
          {
            title: "API Engineer",
            salaryAverage: "6-15 LPA",
            demandLevel: "high",
            futureDemandReason: "Microservices and partner integrations multiply API surface area.",
            skills: ["REST/gRPC", "Schema Design", "Auth", "Versioning", "Observability"]
          },
          {
            title: "Engineering Manager (IC track)",
            salaryAverage: "12-28 LPA",
            demandLevel: "medium",
            futureDemandReason: "Scaling orgs need leads who can hire, plan, and deliver reliably.",
            skills: ["People Management", "Delivery", "Architecture Awareness", "Stakeholders", "Metrics"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "High demand due to AI-enabled products and digital transformation."
      },
      {
        name: "Data Science & AI",
        domainSummary: "Use data and machine learning models to solve business problems.",
        roleDetails: [
          {
            title: "Data Analyst",
            salary: "5-10 LPA",
            skills: ["SQL", "Python", "Excel", "Power BI/Tableau", "Statistics"]
          },
          {
            title: "ML Engineer",
            salary: "8-20 LPA",
            skills: ["Python", "Machine Learning", "Feature Engineering", "Model Deployment", "MLOps"]
          },
          {
            title: "AI Engineer",
            salary: "10-24 LPA",
            skills: ["Deep Learning", "NLP/CV", "PyTorch/TensorFlow", "Prompt Engineering", "LLM Fine-Tuning"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "Rapidly growing across healthcare, fintech, retail, and manufacturing."
      },
      {
        name: "Cybersecurity",
        domainSummary: "Protect systems, networks, and applications from cyber threats.",
        roleDetails: [
          {
            title: "Security Analyst",
            salary: "6-12 LPA",
            skills: ["SIEM Tools", "Threat Detection", "Network Security", "Incident Response", "Security Monitoring"]
          },
          {
            title: "Penetration Tester",
            salary: "7-15 LPA",
            skills: ["Ethical Hacking", "OWASP", "Burp Suite", "VAPT", "Linux"]
          },
          {
            title: "SOC Engineer",
            salary: "8-16 LPA",
            skills: ["SOC Operations", "SIEM/SOAR", "Log Analysis", "Threat Intelligence", "Scripting"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "Very high as security becomes mandatory in every industry."
      },
      {
        name: "Cloud Computing",
        domainSummary: "Design, deploy, and operate cloud-native systems.",
        roleDetails: [
          {
            title: "Cloud Engineer",
            salary: "7-16 LPA",
            skills: ["AWS/Azure/GCP", "Compute/Storage/Networking", "Monitoring", "Infrastructure as Code", "Linux"]
          },
          {
            title: "DevOps Engineer",
            salary: "8-18 LPA",
            skills: ["CI/CD", "Docker", "Kubernetes", "Terraform", "Observability"]
          },
          {
            title: "Cloud Architect",
            salary: "16-35 LPA",
            skills: ["Cloud Architecture", "Cost Optimization", "High Availability", "Security", "Migration Planning"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "Strong growth with cloud-first strategy across organizations."
      },
      {
        name: "Mobile App Development",
        domainSummary: "Build Android, iOS, and cross-platform mobile applications.",
        roleDetails: [
          {
            title: "Android Developer",
            salary: "5-12 LPA",
            skills: ["Kotlin/Java", "Android SDK", "Jetpack", "REST APIs", "Unit Testing"]
          },
          {
            title: "iOS Developer",
            salary: "6-14 LPA",
            skills: ["Swift", "UIKit/SwiftUI", "Xcode", "App Architecture", "Testing"]
          },
          {
            title: "Flutter Developer",
            salary: "5-13 LPA",
            skills: ["Dart", "Flutter Widgets", "State Management", "Firebase", "REST Integration"]
          }
        ],
        futureProof: "Strong",
        demand5Years: "Consistent with increasing mobile-first consumer behavior."
      },
      {
        name: "UI/UX and Product Design",
        domainSummary: "Create intuitive user journeys and user-friendly digital products.",
        roleDetails: [
          {
            title: "UI Designer",
            salary: "4-10 LPA",
            skills: ["Figma", "Design Systems", "Color/Typography", "Responsive Design", "Prototyping"]
          },
          {
            title: "UX Designer",
            salary: "6-14 LPA",
            skills: ["User Research", "Wireframing", "Information Architecture", "Usability Testing", "Interaction Design"]
          },
          {
            title: "Product Designer",
            salary: "8-20 LPA",
            skills: ["End-to-End Product Design", "Design Thinking", "Metrics", "Collaboration", "Prototyping"]
          }
        ],
        futureProof: "Strong",
        demand5Years: "Growing as companies invest in customer experience."
      },
      {
        name: "Game Development",
        domainSummary: "Develop PC, mobile, and console games with rich interaction.",
        roleDetails: [
          {
            title: "Game Developer",
            salary: "5-12 LPA",
            skills: ["Unity/Unreal", "C#/C++", "Game Physics", "Optimization", "Debugging"]
          },
          {
            title: "Gameplay Programmer",
            salary: "6-14 LPA",
            skills: ["Game Mechanics", "Scripting", "Animation Systems", "AI in Games", "Performance Tuning"]
          },
          {
            title: "Technical Artist",
            salary: "6-15 LPA",
            skills: ["Shaders", "3D Pipelines", "Tooling", "Rendering Basics", "DCC Tools"]
          }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Good demand with expansion in gaming and immersive experiences."
      },
      {
        name: "Blockchain and Web3",
        domainSummary: "Develop decentralized applications and smart contracts.",
        roleDetails: [
          {
            title: "Blockchain Developer",
            salary: "8-20 LPA",
            skills: ["Solidity", "Smart Contracts", "Ethereum", "Cryptography Basics", "Security Audits"]
          },
          {
            title: "Smart Contract Engineer",
            salary: "10-24 LPA",
            skills: ["Solidity", "Hardhat/Foundry", "Gas Optimization", "Testing", "Protocol Design"]
          },
          {
            title: "Web3 Full Stack Developer",
            salary: "8-18 LPA",
            skills: ["Web3.js/Ethers.js", "React", "Wallet Integration", "Token Standards", "Node.js"]
          }
        ],
        futureProof: "Emerging",
        demand5Years: "Selective but promising in fintech, identity, and digital assets."
      },
      {
        name: "DevOps and SRE",
        domainSummary: "Automate delivery pipelines and improve reliability of systems.",
        roleDetails: [
          {
            title: "DevOps Engineer",
            salary: "8-18 LPA",
            skills: ["CI/CD", "Docker", "Kubernetes", "Terraform", "Monitoring"]
          },
          {
            title: "Site Reliability Engineer",
            salary: "10-22 LPA",
            skills: ["Reliability Engineering", "Observability", "Incident Management", "Automation", "Capacity Planning"]
          },
          {
            title: "Platform Engineer",
            salary: "10-24 LPA",
            skills: ["Internal Developer Platforms", "Cloud Native Tools", "Automation", "Security", "Developer Experience"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "High demand as software systems scale and uptime becomes critical."
      },
      {
        name: "QA and Test Automation",
        domainSummary: "Ensure software quality through manual and automated testing.",
        roleDetails: [
          {
            title: "QA Engineer",
            salary: "4-9 LPA",
            skills: ["Test Case Design", "Bug Reporting", "Manual Testing", "Regression Testing", "Agile"]
          },
          {
            title: "Automation Test Engineer",
            salary: "6-14 LPA",
            skills: ["Selenium/Cypress/Playwright", "API Testing", "JavaScript/Java", "Framework Design", "CI Integration"]
          },
          {
            title: "Performance Test Engineer",
            salary: "7-15 LPA",
            skills: ["JMeter/LoadRunner", "Performance Analysis", "Bottleneck Detection", "Monitoring", "Test Strategy"]
          }
        ],
        futureProof: "Strong",
        demand5Years: "Steady growth driven by quality and release velocity requirements."
      },
      {
        name: "Data Engineering",
        domainSummary: "Build robust data pipelines and analytics-ready infrastructure.",
        roleDetails: [
          {
            title: "Data Engineer",
            salary: "8-18 LPA",
            skills: ["SQL", "Python/Scala", "ETL/ELT", "Data Warehousing", "Spark"]
          },
          {
            title: "Big Data Engineer",
            salary: "9-20 LPA",
            skills: ["Hadoop/Spark", "Distributed Systems", "Kafka", "Data Lakes", "Cloud Data Services"]
          },
          {
            title: "Analytics Engineer",
            salary: "8-16 LPA",
            skills: ["dbt", "SQL Modeling", "BI Tools", "Data Governance", "Business Metrics"]
          }
        ],
        futureProof: "Very strong",
        demand5Years: "High because AI and analytics initiatives need clean, scalable data."
      },
      {
        name: "AR/VR and Extended Reality",
        domainSummary: "Create immersive applications for training, gaming, and industry.",
        roleDetails: [
          {
            title: "AR Developer",
            salary: "6-14 LPA",
            skills: ["ARKit/ARCore", "Unity", "3D Math", "Computer Vision Basics", "Optimization"]
          },
          {
            title: "VR Developer",
            salary: "7-16 LPA",
            skills: ["Unity/Unreal", "VR Interaction", "Rendering", "Performance", "UX for Immersive Apps"]
          },
          {
            title: "XR Engineer",
            salary: "8-18 LPA",
            skills: ["XR SDKs", "Spatial Computing", "Real-Time Graphics", "Sensors", "Application Architecture"]
          }
        ],
        futureProof: "Emerging",
        demand5Years: "Growing in education, healthcare simulation, and enterprise training."
      }
    ],
    ECE: [
      {
        name: "Embedded Systems & Firmware",
        domainSummary: "Firmware and low-level software for devices, vehicles, and industrial systems.",
        roleDetails: [
          { title: "Embedded Software Engineer", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["C/C++", "RTOS", "Microcontrollers", "Debugging", "Peripherals"], futureDemandReason: "EVs, robotics, and smart appliances need reliable embedded stacks." },
          { title: "Firmware Developer", salaryAverage: "5-11 LPA", demandLevel: "high", skills: ["Bootloaders", "Drivers", "Hardware Bring-up", "Power Management", "Version Control"], futureDemandReason: "Ongoing need to ship secure, updatable device firmware." },
          { title: "BSP Engineer", salaryAverage: "6-14 LPA", demandLevel: "medium", skills: ["Linux BSP", "Device Trees", "Kernel Modules", "Build Systems", "SoC Datasheets"], futureDemandReason: "Custom boards and SoCs require board-support expertise." },
          { title: "IoT Solutions Engineer", salaryAverage: "5-11 LPA", demandLevel: "high", skills: ["MQTT/CoAP", "Sensors", "Edge Compute", "Security Basics", "Cloud Integration"], futureDemandReason: "Industrial IoT and smart-city pilots expand connected deployments." },
          { title: "Automotive Embedded Engineer", salaryAverage: "7-16 LPA", demandLevel: "high", skills: ["AUTOSAR Basics", "CAN/LIN", "Functional Safety Awareness", "MATLAB/Simulink", "Testing"], futureDemandReason: "Software-defined vehicles increase embedded hiring in automotive." }
        ],
        futureProof: "Strong",
        demand5Years: "Consistent demand from automotive, robotics, and consumer electronics."
      },
      {
        name: "VLSI & Semiconductor",
        domainSummary: "Chip design, verification, and physical implementation for processors and SoCs.",
        roleDetails: [
          { title: "RTL Design Engineer", salaryAverage: "8-18 LPA", demandLevel: "high", skills: ["Verilog/SystemVerilog", "Digital Design", "Timing", "Synthesis Basics", "EDA Tools"], futureDemandReason: "Domestic semiconductor programs increase design hiring." },
          { title: "Verification Engineer", salaryAverage: "7-16 LPA", demandLevel: "high", skills: ["UVM", "SystemVerilog", "Assertions", "Coverage", "Debugging"], futureDemandReason: "Chip complexity makes verification a large, growing function." },
          { title: "Physical Design Engineer", salaryAverage: "8-17 LPA", demandLevel: "medium", skills: ["Floorplanning", "Place & Route", "STA", "Power Analysis", "DRC/LVS"], futureDemandReason: "Advanced nodes need skilled PD for timing closure." },
          { title: "DFT Engineer", salaryAverage: "7-15 LPA", demandLevel: "medium", skills: ["Scan Chains", "ATPG", "BIST", "JTAG", "Fault Models"], futureDemandReason: "Manufacturing test is mandatory for every tape-out." },
          { title: "Analog/Mixed-Signal Engineer", salaryAverage: "8-19 LPA", demandLevel: "medium", skills: ["Spice", "Layout Awareness", "PLL/ADC Basics", "Noise Analysis", "Measurement"], futureDemandReason: "RF and power-management blocks remain specialist-heavy." }
        ],
        futureProof: "Very strong",
        demand5Years: "Strong long-term need as countries invest in chip supply chains."
      },
      {
        name: "RF, Wireless & Antenna",
        domainSummary: "Radio systems for telecom, Wi‑Fi, cellular, and satellite connectivity.",
        roleDetails: [
          { title: "RF Engineer", salaryAverage: "6-14 LPA", demandLevel: "medium", skills: ["Smith Charts", "Link Budgets", "PA/LNA", "Filters", "Test Equipment"], futureDemandReason: "5G/6G rollouts and private networks sustain RF roles." },
          { title: "Wireless Protocol Engineer", salaryAverage: "7-16 LPA", demandLevel: "high", skills: ["LTE/5G NR Basics", "MAC/PHY Concepts", "Wireshark", "Embedded C", "3GPP Reading"], futureDemandReason: "More devices require reliable licensed/unlicensed spectrum stacks." },
          { title: "Antenna Engineer", salaryAverage: "6-13 LPA", demandLevel: "medium", skills: ["HFSS/FEKO", "MIMO", "PCB Antennas", "Measurements", "Tuning"], futureDemandReason: "Compact, multi-band antennas are needed across consumer electronics." },
          { title: "DSP Engineer", salaryAverage: "7-15 LPA", demandLevel: "high", skills: ["MATLAB", "FFT/Filters", "Fixed-Point", "Real-Time DSP", "Audio/Radar Basics"], futureDemandReason: "Signal processing is core to modems, audio, and sensing." }
        ],
        futureProof: "Strong",
        demand5Years: "Steady hiring tied to telecom capex and device refresh cycles."
      },
      {
        name: "Telecom & Networking Hardware",
        domainSummary: "Hardware and integration for routers, switches, access networks, and data centers.",
        roleDetails: [
          { title: "Network Hardware Engineer", salaryAverage: "6-13 LPA", demandLevel: "medium", skills: ["Ethernet", "Switching ASICs", "PCB Review", "Thermal", "Bring-up"], futureDemandReason: "Data-center build-outs and enterprise upgrades need hardware depth." },
          { title: "Optical Transmission Engineer", salaryAverage: "7-15 LPA", demandLevel: "medium", skills: ["DWDM", "OTN", "Fiber Link Design", "Test Instruments", "Troubleshooting"], futureDemandReason: "Backbone capacity upgrades remain a recurring investment." },
          { title: "Field Application Engineer (Telecom)", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Customer Demos", "Integration", "Documentation", "Debugging", "Travel"], futureDemandReason: "Vendors need FAEs to deploy complex telecom products on-site." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Stable demand with fiberization, 5G densification, and enterprise networking."
      },
      {
        name: "PCB, Hardware & Power Electronics",
        domainSummary: "Board design, power stages, and hardware bring-up for products and industrial equipment.",
        roleDetails: [
          { title: "PCB Design Engineer", salaryAverage: "5-11 LPA", demandLevel: "high", skills: ["Altium/KiCad", "High-Speed Rules", "Stack-up", "DFM", "SI/PI Awareness"], futureDemandReason: "Every electronics product needs fast, manufacturable boards." },
          { title: "Hardware Design Engineer", salaryAverage: "6-13 LPA", demandLevel: "high", skills: ["Schematic Design", "Component Selection", "Prototyping", "Validation", "Compliance Basics"], futureDemandReason: "Product companies continuously refresh hardware platforms." },
          { title: "Power Electronics Engineer", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Converters", "Magnetics", "EMI/EMC", "Thermal", "Control Loops"], futureDemandReason: "EV charging, renewables, and industrial drives expand power-electronics hiring." }
        ],
        futureProof: "Strong",
        demand5Years: "Growth in electrification increases need for robust hardware design."
      }
    ],
    Mechanical: [
      {
        name: "Design & Manufacturing",
        domainSummary: "CAD-driven design, production engineering, and plant operations.",
        roleDetails: [
          { title: "Design Engineer", salaryAverage: "4.5-10 LPA", demandLevel: "medium", skills: ["SolidWorks/Creo", "GD&T", "FEA Basics", "Prototyping", "DFMEA"], futureDemandReason: "Manufacturers need iterative design for cost and performance." },
          { title: "Production / Manufacturing Engineer", salaryAverage: "4-8 LPA", demandLevel: "medium", skills: ["Process Planning", "Lean", "Line Balancing", "Quality Tools", "Automation Awareness"], futureDemandReason: "Output and efficiency improvements are always in demand on the shop floor." },
          { title: "Quality Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["SPC", "ISO Systems", "Root Cause", "Metrology", "Supplier Quality"], futureDemandReason: "Regulated industries require continuous quality assurance." },
          { title: "Tooling Engineer", salaryAverage: "5-10 LPA", demandLevel: "medium", skills: ["Fixtures", "Jigs", "CNC Awareness", "Tolerancing", "Maintenance Coordination"], futureDemandReason: "Precision manufacturing depends on reliable tooling." },
          { title: "NPD Engineer", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Design Reviews", "Pilot Builds", "Testing Plans", "Cross-functional Coordination", "Documentation"], futureDemandReason: "New product introductions are recurring in consumer and industrial goods." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Stable with growth in EV and smart manufacturing sectors."
      },
      {
        name: "Automotive & EV",
        domainSummary: "Vehicle systems, powertrain, chassis, and EV-specific subsystems.",
        roleDetails: [
          { title: "Automotive Design Engineer", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["CATIA/NX", "Vehicle Packaging", "Crash Basics", "Materials", "Testing"], futureDemandReason: "EV platforms and model refreshes keep automotive design busy." },
          { title: "Battery Systems Engineer", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["BMS Concepts", "Thermal", "Safety", "Testing", "Standards Awareness"], futureDemandReason: "Battery performance and safety are central to EV adoption." },
          { title: "CAE Engineer", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Ansa/HyperMesh", "NVH", "Durability", "Optimization", "Post-processing"], futureDemandReason: "Simulation reduces prototypes and speeds certification cycles." },
          { title: "HVAC Thermal Engineer (Mobility)", salaryAverage: "5-10 LPA", demandLevel: "medium", skills: ["CFD Basics", "Thermal Management", "Testing", "1D/3D Tools"], futureDemandReason: "Thermal constraints tighten as power density rises in EVs." }
        ],
        futureProof: "Strong",
        demand5Years: "EV transition and supplier ecosystem expansion drive hiring."
      },
      {
        name: "Energy, HVAC & Thermal",
        domainSummary: "Heating, cooling, and energy systems for buildings and industry.",
        roleDetails: [
          { title: "HVAC Design Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Load Calculations", "Ducting", "Codes", "Energy Modeling", "AutoCAD"], futureDemandReason: "Urban construction and retrofits require compliant HVAC design." },
          { title: "Thermal Engineer", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Heat Transfer", "CFD", "Experiments", "Materials", "Packaging"], futureDemandReason: "Electronics and industrial equipment need thermal reliability." },
          { title: "Maintenance & Reliability Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["RCM", "CMMS", "Vibration", "Lubrication", "KPIs"], futureDemandReason: "Uptime-focused plants invest in reliability engineering." }
        ],
        futureProof: "Moderate",
        demand5Years: "Steady need tied to infrastructure, climate systems, and industrial uptime."
      },
      {
        name: "Aerospace & Defense (Mechanical)",
        domainSummary: "Structures, propulsion support, and mechanical integration for aerospace programs.",
        roleDetails: [
          { title: "Structural Analyst", salaryAverage: "6-14 LPA", demandLevel: "medium", skills: ["FEA", "Hand Calculations", "Materials", "Fatigue Basics", "Reporting"], futureDemandReason: "Certification-driven programs need rigorous structural evidence." },
          { title: "Integration Engineer", salaryAverage: "6-13 LPA", demandLevel: "medium", skills: ["Interface Control", "Assembly Sequencing", "Testing", "Configuration", "Stakeholder Coordination"], futureDemandReason: "Complex systems require careful mechanical integration." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Specialized hiring tied to defense modernization and civil aerospace recovery."
      }
    ],
    Civil: [
      {
        name: "Infrastructure & Construction",
        domainSummary: "Site execution, highways, bridges, and general civil project delivery.",
        roleDetails: [
          { title: "Site Engineer", salaryAverage: "3.5-8 LPA", demandLevel: "medium", skills: ["Method Statements", "Survey Basics", "Quality Checks", "Safety", "Coordination"], futureDemandReason: "Large civil projects need on-site execution engineers." },
          { title: "Planning Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Scheduling", "Primavera/MS Project", "Baselines", "Risk", "Reporting"], futureDemandReason: "Time and cost control remain critical for contractors." },
          { title: "Quantity Surveyor", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Estimation", "Contracts", "BOQ", "Claims", "Vendor Coordination"], futureDemandReason: "Procurement and billing accuracy depends on strong quantity surveying." },
          { title: "Project Coordinator", salaryAverage: "4-8 LPA", demandLevel: "medium", skills: ["Documentation", "Meetings", "Tracking", "Communication", "Compliance"], futureDemandReason: "Multi-vendor projects need coordinators to keep workstreams aligned." }
        ],
        futureProof: "Moderate",
        demand5Years: "Steady due to urban development and infrastructure projects."
      },
      {
        name: "Structural Engineering",
        domainSummary: "Analysis and design of buildings, bridges, and industrial structures.",
        roleDetails: [
          { title: "Structural Design Engineer", salaryAverage: "4.5-10 LPA", demandLevel: "medium", skills: ["ETABS/STAAD", "Codes", "Detailing Coordination", "Seismic Basics", "Peer Review"], futureDemandReason: "Urban density and safety codes sustain structural design demand." },
          { title: "Bridge Engineer", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Loads", "Foundations", "Inspection", "Retrofit", "Standards"], futureDemandReason: "Aging infrastructure and new corridors require bridge expertise." },
          { title: "Structural Inspector", salaryAverage: "4-8 LPA", demandLevel: "medium", skills: ["NDT Awareness", "Codes", "Reporting", "Site Visits", "Risk Notes"], futureDemandReason: "Insurance and regulators push periodic structural assessments." }
        ],
        futureProof: "Moderate",
        demand5Years: "Ongoing retrofit and new-build activity supports structural roles."
      },
      {
        name: "Geotechnical & Survey",
        domainSummary: "Soil mechanics, foundations, and land surveying for safe construction.",
        roleDetails: [
          { title: "Geotechnical Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Soil Testing", "Slope Stability", "Foundations", "Reports", "Field Investigations"], futureDemandReason: "High-rises and infra need soil and foundation risk management." },
          { title: "Land Surveyor", salaryAverage: "3.5-7 LPA", demandLevel: "medium", skills: ["Total Station", "GNSS", "CAD", "Contours", "Legal Awareness"], futureDemandReason: "Accurate land records are required before design and execution." },
          { title: "GIS Analyst (Civil)", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["ArcGIS/QGIS", "Spatial Analysis", "Remote Sensing Basics", "Cartography", "Python Optional"], futureDemandReason: "Smart-city and utility mapping projects hire GIS skills." }
        ],
        futureProof: "Moderate",
        demand5Years: "Infrastructure planning increasingly uses geospatial data and site intelligence."
      },
      {
        name: "Environment, Water & Sustainability",
        domainSummary: "Water resources, environmental compliance, and green building practices.",
        roleDetails: [
          { title: "Environmental Engineer", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["EIA Basics", "Pollution Control", "Monitoring", "Permits", "Reporting"], futureDemandReason: "Tighter regulation increases compliance workload." },
          { title: "Water Resources Engineer", salaryAverage: "4-10 LPA", demandLevel: "medium", skills: ["Hydrology", "Stormwater", "Hydraulic Modeling", "Design", "Field Data"], futureDemandReason: "Flooding risk and water security projects need specialized analysis." },
          { title: "Green Building Consultant", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["IGBC/LEED", "Energy Simulation", "Materials", "Documentation", "Audits"], futureDemandReason: "Developers pursue ratings for market differentiation and compliance." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Climate adaptation and ESG reporting expand environment-related roles."
      }
    ],
    "AI & Data Science": [
      {
        name: "Applied AI & ML Engineering",
        domainSummary: "Build, ship, and monitor ML models for products and enterprise workflows.",
        roleDetails: [
          { title: "AI Engineer", salaryAverage: "10-22 LPA", demandLevel: "high", skills: ["Python", "PyTorch/TensorFlow", "Model Deployment", "APIs", "Monitoring"], futureDemandReason: "Product teams embed ML features across verticals." },
          { title: "Computer Vision Engineer", salaryAverage: "9-20 LPA", demandLevel: "high", skills: ["OpenCV", "Detection/Segmentation", "Annotation Pipelines", "Edge Deployment", "Evaluation"], futureDemandReason: "Manufacturing, retail, and security rely on vision automation." },
          { title: "NLP Engineer", salaryAverage: "10-22 LPA", demandLevel: "high", skills: ["Transformers", "Tokenization", "RAG", "Evaluation", "LLM Tooling"], futureDemandReason: "Language AI is becoming default for search, support, and copilots." },
          { title: "Speech / Audio ML Engineer", salaryAverage: "8-18 LPA", demandLevel: "medium", skills: ["Signal Processing", "ASR", "TTS Basics", "Datasets", "Latency"], futureDemandReason: "Voice interfaces and accessibility features keep audio ML relevant." },
          { title: "Recommendation Systems Engineer", salaryAverage: "9-19 LPA", demandLevel: "high", skills: ["Ranking", "Embeddings", "A/B Testing", "Feature Stores", "Ethics Basics"], futureDemandReason: "Personalization directly impacts revenue for digital platforms." }
        ],
        futureProof: "Very strong",
        demand5Years: "Expected to accelerate significantly in almost all industries."
      },
      {
        name: "Data Science & Analytics",
        domainSummary: "Inference, forecasting, and decision support from structured and unstructured data.",
        roleDetails: [
          { title: "Data Scientist", salaryAverage: "8-18 LPA", demandLevel: "high", skills: ["Statistics", "Python/R", "Experimentation", "SQL", "Storytelling"], futureDemandReason: "Leadership wants measurable impact from data, not just dashboards." },
          { title: "Applied Researcher (ML)", salaryAverage: "10-24 LPA", demandLevel: "medium", skills: ["Literature Review", "Prototyping", "Benchmarks", "Publishing", "Collaboration"], futureDemandReason: "Companies invest in differentiated models and novel methods." },
          { title: "Decision Scientist", salaryAverage: "8-16 LPA", demandLevel: "medium", skills: ["Causal Thinking", "Optimization", "Simulation", "Stakeholder Management", "Metrics"], futureDemandReason: "Complex trade-offs need rigorous decision frameworks." }
        ],
        futureProof: "Very strong",
        demand5Years: "Analytics maturity is still rising in traditional enterprises."
      },
      {
        name: "MLOps, Data & Platform",
        domainSummary: "Pipelines, feature stores, and reliable production ML systems.",
        roleDetails: [
          { title: "MLOps Engineer", salaryAverage: "9-20 LPA", demandLevel: "high", skills: ["CI/CD", "Model Registry", "Docker/K8s", "Monitoring", "Data Versioning"], futureDemandReason: "Scaling ML requires operational discipline and automation." },
          { title: "Data Engineer (ML-focused)", salaryAverage: "8-18 LPA", demandLevel: "high", skills: ["Spark", "Streaming", "Feature Pipelines", "Lakehouse", "SQL"], futureDemandReason: "Model quality depends on timely, governed training data." },
          { title: "AI Platform Engineer", salaryAverage: "10-22 LPA", demandLevel: "high", skills: ["GPU Scheduling", "Serving Frameworks", "Cost Controls", "Security", "Developer UX"], futureDemandReason: "Central platforms reduce duplicated effort across teams." }
        ],
        futureProof: "Very strong",
        demand5Years: "Production AI adoption increases need for platform and reliability roles."
      }
    ]
  },
  Medical: {
    MBBS: [
      {
        name: "Clinical Practice (General & Hospital Medicine)",
        domainSummary: "Direct patient care across OPD, wards, and emergency settings.",
        roleDetails: [
          { title: "General Physician", salaryAverage: "8-18 LPA", demandLevel: "high", skills: ["Diagnosis", "Evidence-based Care", "Comorbidities", "Communication", "Ethics"], futureDemandReason: "Primary-care capacity remains below population needs in many regions." },
          { title: "Resident Doctor / Junior Resident", salaryAverage: "6-12 LPA", demandLevel: "high", skills: ["Clinical Rotations", "Procedures (Basics)", "Documentation", "Handoffs", "Learning Agility"], futureDemandReason: "Teaching hospitals expand intakes as care complexity rises." },
          { title: "Medical Officer (Govt / Corporate)", salaryAverage: "7-15 LPA", demandLevel: "high", skills: ["Public Health Basics", "Protocols", "Medico-legal Awareness", "Team Leadership", "Emergency Response"], futureDemandReason: "Public programs and occupational health need steady physician staffing." },
          { title: "Intensivist (Critical Care)", salaryAverage: "12-28 LPA", demandLevel: "high", skills: ["Ventilation", "Sepsis Protocols", "Multi-organ Support", "Family Communication", "Procedures"], futureDemandReason: "ICU beds and critical-care specialization are scaling with referrals." },
          { title: "Emergency Medicine Physician", salaryAverage: "10-22 LPA", demandLevel: "high", skills: ["Triage", "Trauma Algorithms", "Stabilization", "Team Coordination", "Rapid Decisions"], futureDemandReason: "Urban ER volumes and trauma networks increase EM hiring." }
        ],
        futureProof: "Very strong",
        demand5Years: "High demand because healthcare need consistently rises."
      },
      {
        name: "Specialty & Super-Specialty Care",
        domainSummary: "Focused practice in departments such as surgery, medicine subspecialties, and diagnostics.",
        roleDetails: [
          { title: "Surgeon (General / Ortho / Others)", salaryAverage: "12-35 LPA", demandLevel: "high", skills: ["Operative Skills", "Pre/Post-op Care", "Infection Control", "Teamwork", "Judgment"], futureDemandReason: "Elective backlog and trauma sustain surgical throughput." },
          { title: "Radiologist", salaryAverage: "12-30 LPA", demandLevel: "high", skills: ["Modalities", "Reporting", "Contrast Safety", "AI Tools", "Peer Review"], futureDemandReason: "Imaging volume grows as diagnostics expand." },
          { title: "Pathologist", salaryAverage: "10-22 LPA", demandLevel: "medium", skills: ["Histopath", "Cytopath", "Lab QA", "Molecular Basics", "Turnaround"], futureDemandReason: "Precision medicine increases testing complexity and oversight." },
          { title: "Anesthesiologist", salaryAverage: "12-28 LPA", demandLevel: "high", skills: ["Airway", "Regional Blocks", "Peri-op Risk", "Crisis Management", "Protocols"], futureDemandReason: "Surgical growth and safety standards support anesthesia staffing." }
        ],
        futureProof: "Very strong",
        demand5Years: "Referral networks and tertiary care expansion keep specialty demand high."
      },
      {
        name: "Public Health & Community Medicine",
        domainSummary: "Population-level prevention, outbreak response, and program implementation.",
        roleDetails: [
          { title: "Public Health Specialist", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Epidemiology Basics", "Surveillance", "Program Design", "Stakeholders", "Data"], futureDemandReason: "Outbreak preparedness and NCD programs need medical leadership." },
          { title: "Occupational Health Physician", salaryAverage: "7-16 LPA", demandLevel: "medium", skills: ["Workplace Risk", "Fitness-for-work", "Compliance", "Preventive Care", "Reporting"], futureDemandReason: "Large employers must manage workforce health and safety." }
        ],
        futureProof: "Strong",
        demand5Years: "Government and corporate wellness programs expand preventive capacity."
      }
    ],
    BDS: [
      {
        name: "Clinical Dentistry",
        domainSummary: "Chairside dental care, surgery, and restorative work.",
        roleDetails: [
          { title: "General Dentist", salaryAverage: "5-14 LPA", demandLevel: "high", skills: ["Restorations", "Extractions", "Diagnosis", "Sterilization", "Patient Education"], futureDemandReason: "Routine dental load grows with awareness and insurance uptake." },
          { title: "Orthodontist", salaryAverage: "8-22 LPA", demandLevel: "medium", skills: ["Appliances", "Growth Modification", "Biomechanics", "Treatment Planning", "Aesthetics"], futureDemandReason: "Cosmetic demand supports orthodontic practices in cities." },
          { title: "Oral & Maxillofacial Surgeon", salaryAverage: "10-28 LPA", demandLevel: "medium", skills: ["Trauma", "Implants", "Anesthesia", "Surgical Planning", "Complications Management"], futureDemandReason: "Complex cases and trauma referrals require OMFS depth." },
          { title: "Endodontist", salaryAverage: "7-18 LPA", demandLevel: "medium", skills: ["RCT", "Microscopy", "Pain Management", "Restoration", "Retreatment"], futureDemandReason: "Tooth preservation focus increases advanced endo demand." },
          { title: "Pediatric Dentist", salaryAverage: "6-16 LPA", demandLevel: "medium", skills: ["Behavior Guidance", "Preventive Care", "Sedation Awareness", "Growth", "Parent Counseling"], futureDemandReason: "Early intervention programs expand pediatric dental access." }
        ],
        futureProof: "Strong",
        demand5Years: "Good demand in urban clinics and cosmetic dentistry."
      },
      {
        name: "Dental Public Health & Academia",
        domainSummary: "Community programs, screening, and training future dentists.",
        roleDetails: [
          { title: "Academic Dentist / Lecturer", salaryAverage: "5-12 LPA", demandLevel: "medium", skills: ["Teaching", "Research Basics", "Curriculum", "Mentorship", "Clinical Supervision"], futureDemandReason: "New dental colleges need faculty pipelines." },
          { title: "Dental Public Health Officer", salaryAverage: "4-10 LPA", demandLevel: "medium", skills: ["Screening Camps", "Epidemiology", "Program Evaluation", "Partnerships", "Reporting"], futureDemandReason: "School dental programs and public schemes need coordinators." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Preventive dentistry and education roles grow with public funding."
      }
    ],
    Pharmacy: [
      {
        name: "Clinical & Retail Pharmacy",
        domainSummary: "Medication dispensing, counseling, and safety in hospitals and retail.",
        roleDetails: [
          { title: "Hospital Pharmacist", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Formulary", "Dosing", "Interactions", "IV Admixture", "Documentation"], futureDemandReason: "Complex regimens increase need for inpatient pharmacy oversight." },
          { title: "Clinical Pharmacist", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Medication Therapy", "Renal/Hepatic Adjustments", "Antibiotic Stewardship", "Team Rounds", "Research"], futureDemandReason: "Hospitals adopt pharmacist-led optimization programs." },
          { title: "Retail / Community Pharmacist", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Dispensing", "Counseling", "Inventory", "Compliance", "OTC Guidance"], futureDemandReason: "Last-mile access makes retail pharmacy ubiquitous." },
          { title: "Regulatory Affairs (Pharma)", salaryAverage: "6-14 LPA", demandLevel: "medium", skills: ["Submissions", "GxP", "Labeling", "Audits", "Communication"], futureDemandReason: "Global markets require strict regulatory documentation." }
        ],
        futureProof: "Strong",
        demand5Years: "Growing with biotech and drug innovation sectors."
      },
      {
        name: "Pharma R&D, QA & Manufacturing",
        domainSummary: "Drug development, quality systems, and production operations.",
        roleDetails: [
          { title: "Formulation Scientist", salaryAverage: "5-12 LPA", demandLevel: "medium", skills: ["Preformulation", "Stability", "Analytical Coordination", "DOE", "Documentation"], futureDemandReason: "Generics and novel modalities need robust formulation work." },
          { title: "Quality Assurance / QC Analyst", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["GMP", "Validation", "Testing Methods", "Deviations", "CAPA"], futureDemandReason: "Regulators enforce quality rigor across supply chains." },
          { title: "Production Pharmacist", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Batch Records", "Equipment", "Cleaning Validation", "Safety", "Yield"], futureDemandReason: "Manufacturing scale-up requires trained production staff." }
        ],
        futureProof: "Strong",
        demand5Years: "Domestic manufacturing incentives increase technical pharmacy hiring."
      },
      {
        name: "Clinical Research & Pharmacovigilance",
        domainSummary: "Trials operations, safety monitoring, and data integrity for new medicines.",
        roleDetails: [
          { title: "Clinical Research Associate (CRA)", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Monitoring", "GCP", "Site Coordination", "Queries", "Travel"], futureDemandReason: "Global trials continue to outsource monitoring to India." },
          { title: "Clinical Data Manager", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["EDC", "SDTM Basics", "Queries", "Locks", "Standards"], futureDemandReason: "Digital trials increase data volume and governance needs." },
          { title: "Drug Safety Associate", salaryAverage: "5-11 LPA", demandLevel: "medium", skills: ["Case Processing", "MedDRA", "Regulations", "Signal Awareness", "Documentation"], futureDemandReason: "Post-market surveillance obligations expand with product portfolios." }
        ],
        futureProof: "Strong",
        demand5Years: "CRO growth and safety workloads support steady hiring."
      }
    ],
    Nursing: [
      {
        name: "Bedside & Specialty Nursing",
        domainSummary: "Direct nursing care across wards, ICUs, OT, and community settings.",
        roleDetails: [
          { title: "Registered Nurse (Medical/Surgical)", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Care Plans", "Medication Administration", "Infection Control", "Communication", "Documentation"], futureDemandReason: "Bed expansion outpaces nurse supply in many hospitals." },
          { title: "ICU Nurse", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Hemodynamics", "Ventilators", "Protocols", "Crisis Response", "Family Support"], futureDemandReason: "Critical-care complexity increases ICU staffing ratios." },
          { title: "OT Nurse", salaryAverage: "4-9 LPA", demandLevel: "high", skills: ["Asepsis", "Instrument Handling", "Anesthesia Support", "Counts", "Emergency Readiness"], futureDemandReason: "Elective surgery growth raises OT throughput." },
          { title: "Pediatric Nurse", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Growth Charts", "Family Education", "Vaccination", "Pain Assessment", "Play Therapy Awareness"], futureDemandReason: "Pediatric units need specialized nursing skills." },
          { title: "Community Health Nurse", salaryAverage: "3-7 LPA", demandLevel: "high", skills: ["Home Visits", "Screening", "Referrals", "Public Health", "Counseling"], futureDemandReason: "Primary-care networks emphasize community follow-up." }
        ],
        futureProof: "Very strong",
        demand5Years: "Very high due to chronic care and aging population."
      },
      {
        name: "Nursing Leadership & Education",
        domainSummary: "Unit leadership, quality, and training pathways for nurses.",
        roleDetails: [
          { title: "Nurse Manager / Incharge", salaryAverage: "5-12 LPA", demandLevel: "medium", skills: ["Staffing", "Quality Metrics", "Budget Basics", "Conflict Resolution", "Policy"], futureDemandReason: "Accreditation and patient safety require strong nurse leaders." },
          { title: "Nurse Educator", salaryAverage: "4-10 LPA", demandLevel: "medium", skills: ["Simulation", "Competency Mapping", "Mentoring", "Curriculum", "Assessment"], futureDemandReason: "Skill upgrades and new equipment increase training needs." }
        ],
        futureProof: "Strong",
        demand5Years: "Nursing colleges and hospital academies expand educator roles."
      }
    ],
    Physiotherapy: [
      {
        name: "Clinical Physiotherapy",
        domainSummary: "Movement, pain management, and rehabilitation across settings.",
        roleDetails: [
          { title: "Physiotherapist (OPD)", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Assessment", "Manual Therapy", "Exercise Prescription", "Education", "Outcome Tracking"], futureDemandReason: "MSK complaints rise with sedentary lifestyles." },
          { title: "Sports Physiotherapist", salaryAverage: "4-10 LPA", demandLevel: "medium", skills: ["Return-to-play", "Taping", "Load Management", "Injury Prevention", "Performance"], futureDemandReason: "Sports leagues and fitness culture expand athlete care." },
          { title: "Neuro Rehab Physiotherapist", salaryAverage: "4-9 LPA", demandLevel: "high", skills: ["Gait Training", "Balance", "Stroke Protocols", "Equipment", "Caregiver Training"], futureDemandReason: "Stroke and neuro cases increase rehab demand." },
          { title: "Cardiopulmonary Physiotherapist", salaryAverage: "4-9 LPA", demandLevel: "medium", skills: ["Breathing Exercises", "Secretion Clearance", "Endurance", "Safety", "Monitoring"], futureDemandReason: "Post-COVID and COPD programs emphasize pulmonary rehab." },
          { title: "Pediatric Physiotherapist", salaryAverage: "3-8 LPA", demandLevel: "medium", skills: ["Development", "Play-based Therapy", "Parent Coaching", "Equipment", "School Liaison"], futureDemandReason: "Early intervention services expand for developmental delays." }
        ],
        futureProof: "Strong",
        demand5Years: "Steady rise through sports medicine and post-op rehab."
      },
      {
        name: "Corporate Wellness & Ergonomics",
        domainSummary: "Workplace health programs and injury prevention for organizations.",
        roleDetails: [
          { title: "Ergonomics Consultant", salaryAverage: "4-10 LPA", demandLevel: "medium", skills: ["Workstation Assessments", "Injury Prevention", "Training", "Reporting", "Tooling"], futureDemandReason: "IT/ITES employers invest in ergonomics to reduce absenteeism." },
          { title: "Home-care Rehab Specialist", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Geriatric Care", "Mobility Aids", "Family Training", "Safety", "Coordination"], futureDemandReason: "Aging at home increases demand for domiciliary therapy." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Insurance-covered home care and corporate wellness broaden employment."
      }
    ]
  },
  Commerce: {
    Accounting: [
      {
        name: "Accounting, Reporting & Audit",
        domainSummary: "Bookkeeping through statutory audits and financial-statement assurance.",
        roleDetails: [
          { title: "General Accountant", salaryAverage: "3-8 LPA", demandLevel: "high", skills: ["Tally/ERP", "Reconciliations", "GST", "Payables/Receivables", "Month-end Close"], futureDemandReason: "Every company needs reliable books and timely close." },
          { title: "Financial Reporting Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Ind AS/IFRS", "Consolidations", "Disclosures", "Narratives", "Controls"], futureDemandReason: "Listed entities and investors expect transparent reporting." },
          { title: "Internal Auditor", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Risk Assessment", "Controls Testing", "SOX", "Findings", "Remediation"], futureDemandReason: "Fraud risk and governance drive internal audit budgets." },
          { title: "Statutory Auditor (Article/Associate)", salaryAverage: "4-11 LPA", demandLevel: "medium", skills: ["Sampling", "Evidence", "Standards", "Audit Tools", "Client Management"], futureDemandReason: "Regulatory filings require audit firms to scale teams." },
          { title: "Tax Consultant", salaryAverage: "5-14 LPA", demandLevel: "high", skills: ["Income Tax", "GST Litigation", "Transfer Pricing Basics", "Research", "Advisory"], futureDemandReason: "Complex tax regimes increase advisory and compliance work." }
        ],
        futureProof: "Strong",
        demand5Years: "Stable demand with increased compliance and global reporting."
      },
      {
        name: "Management Accounting & FP&A",
        domainSummary: "Budgets, forecasts, and business partnering for performance management.",
        roleDetails: [
          { title: "Management Accountant", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Costing", "Variance Analysis", "Budgeting", "Excel/Models", "Business Partnering"], futureDemandReason: "Margin pressure leads to tighter cost visibility." },
          { title: "FP&A Analyst", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Forecasting", "Scenario Planning", "KPIs", "Dashboards", "Stakeholder Decks"], futureDemandReason: "Leadership wants forward-looking financial decision support." }
        ],
        futureProof: "Strong",
        demand5Years: "FP&A roles expand as companies adopt rolling forecasts and planning tools."
      }
    ],
    Finance: [
      {
        name: "Corporate Finance & Investment",
        domainSummary: "Valuation, M&A support, and capital allocation decisions.",
        roleDetails: [
          { title: "Financial Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Modeling", "Excel", "Research", "Presentations", "Accounting Linkage"], futureDemandReason: "Corporate teams need analysts for planning and investment decisions." },
          { title: "Investment Banking Analyst", salaryAverage: "10-22 LPA", demandLevel: "medium", skills: ["DCF", "Comps", "Pitch Books", "Due Diligence", "Long Hours"], futureDemandReason: "Capital markets activity creates episodic but high-value hiring." },
          { title: "Equity Research Analyst", salaryAverage: "7-16 LPA", demandLevel: "medium", skills: ["Sector Deep Dives", "Models", "Reports", "Regulations", "Communication"], futureDemandReason: "Investors still consume research despite automation." },
          { title: "Credit Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Financial Ratios", "Risk Grading", "Covenants", "Documentation", "Monitoring"], futureDemandReason: "Lending growth requires disciplined underwriting." },
          { title: "Treasury Analyst", salaryAverage: "6-14 LPA", demandLevel: "medium", skills: ["Cash Forecasting", "FX", "Liquidity", "Banking Relationships", "Controls"], futureDemandReason: "Volatility and global ops increase treasury complexity." }
        ],
        futureProof: "Strong",
        demand5Years: "Growing in fintech, investment advisory, and corporate planning."
      },
      {
        name: "Risk, Compliance & Treasury",
        domainSummary: "Enterprise risk, regulatory compliance, and financial crime controls.",
        roleDetails: [
          { title: "Risk Analyst", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Risk Frameworks", "KRI", "Scenario Testing", "Reporting", "Tools"], futureDemandReason: "Regulators push stronger risk governance across sectors." },
          { title: "Compliance Officer", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Policies", "Regulations", "Training", "Audits", "Remediation"], futureDemandReason: "Penalties and reputational risk increase compliance budgets." }
        ],
        futureProof: "Strong",
        demand5Years: "Financial crime and conduct rules tighten hiring in risk controls."
      }
    ],
    "Business Analytics": [
      {
        name: "Business Intelligence & Analytics",
        domainSummary: "Dashboards, KPIs, and operational analytics for decisions.",
        roleDetails: [
          { title: "Business Analyst", salaryAverage: "5-13 LPA", demandLevel: "high", skills: ["Requirements", "Process Mapping", "SQL", "Stakeholder Management", "UAT"], futureDemandReason: "Digital transformation projects need translators between IT and business." },
          { title: "BI Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Power BI/Tableau", "SQL", "Data Modeling", "ETL Basics", "Storytelling"], futureDemandReason: "Self-serve analytics adoption increases dashboard demand." },
          { title: "Operations Analyst", salaryAverage: "5-11 LPA", demandLevel: "high", skills: ["Process Metrics", "Optimization", "Forecasting", "Excel", "Cross-functional Work"], futureDemandReason: "Supply chains and service ops need continuous improvement." },
          { title: "Product Analyst", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Funnels", "Experimentation", "A/B Tests", "Instrumentation", "Metrics"], futureDemandReason: "Product-led growth requires disciplined measurement." },
          { title: "Revenue / Growth Analyst", salaryAverage: "6-14 LPA", demandLevel: "high", skills: ["Cohorts", "Pricing Experiments", "Sales Analytics", "CRM Data", "Strategy"], futureDemandReason: "Revenue teams invest in analytics to improve conversion." }
        ],
        futureProof: "Very strong",
        demand5Years: "High growth as businesses rely more on data-driven decisions."
      },
      {
        name: "Data Storytelling & Consulting",
        domainSummary: "Insight delivery for leadership and external clients.",
        roleDetails: [
          { title: "Analytics Consultant", salaryAverage: "7-16 LPA", demandLevel: "medium", skills: ["Frameworks", "Hypothesis Testing", "Client Management", "Slides", "Delivery"], futureDemandReason: "Enterprises hire consultants to accelerate analytics maturity." }
        ],
        futureProof: "Strong",
        demand5Years: "Consulting firms expand analytics practices as AI adoption spreads."
      }
    ],
    Marketing: [
      {
        name: "Digital Marketing & Growth",
        domainSummary: "Online acquisition, retention, and performance marketing.",
        roleDetails: [
          { title: "SEO Specialist", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Technical SEO", "Content Strategy", "Keyword Research", "Analytics", "Tools"], futureDemandReason: "Organic search remains a durable acquisition channel." },
          { title: "Performance Marketer", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Paid Ads", "Attribution", "Creative Testing", "Budgeting", "ROAS"], futureDemandReason: "Paid acquisition scales with e-commerce and app growth." },
          { title: "Content Strategist", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Editorial Calendar", "Brand Voice", "Distribution", "SEO Alignment", "Measurement"], futureDemandReason: "AI-assisted content increases need for editorial quality control." },
          { title: "Social Media Manager", salaryAverage: "4-9 LPA", demandLevel: "high", skills: ["Community", "Creatives", "Campaigns", "Crisis Comms", "Analytics"], futureDemandReason: "Brand presence is mandatory across channels." },
          { title: "Email / CRM Marketer", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Lifecycle Journeys", "Segmentation", "Deliverability", "A/B Tests", "CDP Basics"], futureDemandReason: "Retention economics favor owned channels and CRM automation." }
        ],
        futureProof: "Strong",
        demand5Years: "Strong demand across e-commerce and brand-led businesses."
      },
      {
        name: "Brand, PR & Communications",
        domainSummary: "Positioning, media relations, and corporate communications.",
        roleDetails: [
          { title: "Brand Manager", salaryAverage: "6-16 LPA", demandLevel: "medium", skills: ["Positioning", "Campaigns", "Research", "Agency Management", "Budgets"], futureDemandReason: "Competitive differentiation keeps brand roles critical." },
          { title: "Public Relations Specialist", salaryAverage: "4-11 LPA", demandLevel: "medium", skills: ["Media Outreach", "Storytelling", "Crisis", "Events", "Measurement"], futureDemandReason: "Reputation and narrative matter more in volatile markets." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Corporate communications and reputation management grow with scrutiny."
      }
    ],
    Banking: [
      {
        name: "Retail & Branch Banking",
        domainSummary: "Customer-facing banking, sales, and service delivery.",
        roleDetails: [
          { title: "Bank Officer / Relationship Officer", salaryAverage: "4-9 LPA", demandLevel: "high", skills: ["Deposits", "KYC", "Customer Service", "Cross-sell", "Compliance"], futureDemandReason: "Branch networks remain key for retail liability growth." },
          { title: "Relationship Manager (Retail)", salaryAverage: "5-11 LPA", demandLevel: "high", skills: ["Portfolio", "Sales", "Credit Basics", "Service", "Targets"], futureDemandReason: "Banks compete on deepening customer relationships." },
          { title: "Branch Operations Manager", salaryAverage: "5-12 LPA", demandLevel: "medium", skills: ["Operations", "Cash", "Audit", "Team Management", "Controls"], futureDemandReason: "Operational excellence reduces losses and improves CX." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Steady with digital banking and financial inclusion growth."
      },
      {
        name: "Credit, Risk & Corporate Banking",
        domainSummary: "Lending analysis, underwriting, and corporate relationships.",
        roleDetails: [
          { title: "Credit Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Financial Analysis", "Industry Risk", "Documentation", "Monitoring", "Policy"], futureDemandReason: "Corporate and SME lending requires rigorous credit assessment." },
          { title: "Corporate Relationship Manager", salaryAverage: "8-18 LPA", demandLevel: "medium", skills: ["Deal Structuring", "Syndication Awareness", "Risk", "Coordination", "Sector Knowledge"], futureDemandReason: "Mid-market and large corporates need dedicated banking coverage." },
          { title: "Risk Manager (Banking)", salaryAverage: "8-18 LPA", demandLevel: "high", skills: ["Portfolio Risk", "Stress Testing", "Regulations", "Governance", "Reporting"], futureDemandReason: "Regulators enforce stronger capital and risk frameworks." }
        ],
        futureProof: "Moderate to strong",
        demand5Years: "Credit cycles and risk oversight create recurring specialist demand."
      },
      {
        name: "Fintech, Payments & Operations",
        domainSummary: "Digital products, payments rails, and back-office banking operations.",
        roleDetails: [
          { title: "Product Manager (Fintech)", salaryAverage: "10-22 LPA", demandLevel: "high", skills: ["Roadmaps", "UX", "Compliance", "Metrics", "APIs"], futureDemandReason: "UPI and embedded finance drive rapid product iteration." },
          { title: "Payments Operations Analyst", salaryAverage: "5-12 LPA", demandLevel: "high", skills: ["Reconciliation", "Settlement", "Fraud Monitoring", "SLAs", "Vendor Coordination"], futureDemandReason: "Transaction volumes explode with digital payments." },
          { title: "KYC / AML Analyst", salaryAverage: "4-10 LPA", demandLevel: "high", skills: ["Due Diligence", "Screening", "SAR", "Investigations", "Documentation"], futureDemandReason: "Anti-money-laundering rules tighten screening workloads." }
        ],
        futureProof: "Strong",
        demand5Years: "Digital rails and embedded finance expand hiring in product and ops."
      }
    ]
  }
};

const usersKey = "careerPortalUsers";
const activeUserKey = "careerPortalActiveUser";

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const authMessage = document.getElementById("authMessage");

const courseSelect = document.getElementById("course");
const specializationSelect = document.getElementById("specialization");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const authPanel = document.getElementById("authPanel");
const dashboard = document.getElementById("dashboard");
const welcomeLine = document.getElementById("welcomeLine");
const profileLine = document.getElementById("profileLine");
const domainList = document.getElementById("domainList");
const domainDetail = document.getElementById("domainDetail");
const logoutBtn = document.getElementById("logoutBtn");
const topRolesList = document.getElementById("topRolesList");
const roleSearch = document.getElementById("roleSearch");
const filterHighDemand = document.getElementById("filterHighDemand");
const salaryMinSelect = document.getElementById("salaryMin");
const salaryMaxSelect = document.getElementById("salaryMax");
const filterSummary = document.getElementById("filterSummary");

let dashboardFiltersBound = false;

function getUsers() {
  const raw = localStorage.getItem(usersKey);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function setActiveUser(user) {
  localStorage.setItem(activeUserKey, JSON.stringify(user));
}

function getActiveUser() {
  const raw = localStorage.getItem(activeUserKey);
  return raw ? JSON.parse(raw) : null;
}

function setAuthMessage(text, color = "#fda4af") {
  authMessage.style.color = color;
  authMessage.textContent = text;
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.style.color = "#fda4af";
}

function showAuth(tabName, keepMessage = false) {
  const showLogin = tabName === "login";
  loginTab.classList.toggle("active", showLogin);
  registerTab.classList.toggle("active", !showLogin);
  loginView.classList.toggle("hidden", !showLogin);
  registerView.classList.toggle("hidden", showLogin);
  if (!keepMessage) {
    clearAuthMessage();
  }
}

function populateSpecializations(course) {
  const list = specializationMap[course] || [];
  specializationSelect.innerHTML = "<option value=\"\">Select specialization</option>";
  list.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    specializationSelect.appendChild(option);
  });
}

function renderTopRecommended(domains) {
  if (!topRolesList) return;
  const top = getTopRecommendedRoles(domains, 5);
  if (!top.length) {
    topRolesList.innerHTML = "<p class=\"sub\">No roles available yet.</p>";
    return;
  }
  topRolesList.innerHTML = "";
  top.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "top-role-card";
    card.dataset.domainName = item.domain.name;
    card.dataset.roleTitle = item.role.title;
    const badgeClass = item.role.demandLevel || "medium";
    card.innerHTML = `
      <strong>${item.role.title}</strong>
      <span class="meta">${item.domain.name} · typical mid: ${item.role.salaryAverage}</span>
      <span class="badge-demand ${badgeClass}">${badgeClass} demand</span>
    `;
    card.addEventListener("click", () => {
      dashboardState.query = "";
      dashboardState.highDemandOnly = false;
      dashboardState.salaryMin = 0;
      dashboardState.salaryMax = 50;
      if (roleSearch) roleSearch.value = "";
      if (filterHighDemand) filterHighDemand.checked = false;
      if (salaryMinSelect) salaryMinSelect.value = "0";
      if (salaryMaxSelect) salaryMaxSelect.value = "50";
      selectedDomainName = item.domain.name;
      applyFiltersAndRender({ preselectedRoleTitle: item.role.title });
      document.querySelectorAll(".domain-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.domainName === item.domain.name);
        if (b.dataset.domainName === item.domain.name) {
          b.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
      domainDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    topRolesList.appendChild(card);
  });
}

function bindDashboardFiltersOnce() {
  if (dashboardFiltersBound) return;
  dashboardFiltersBound = true;
  roleSearch?.addEventListener("input", (e) => {
    dashboardState.query = e.target.value;
    selectedDomainName = null;
    applyFiltersAndRender();
  });
  filterHighDemand?.addEventListener("change", (e) => {
    dashboardState.highDemandOnly = e.target.checked;
    selectedDomainName = null;
    applyFiltersAndRender();
  });
  salaryMinSelect?.addEventListener("change", (e) => {
    dashboardState.salaryMin = Number(e.target.value);
    if (dashboardState.salaryMin > dashboardState.salaryMax) {
      dashboardState.salaryMax = dashboardState.salaryMin;
      if (salaryMaxSelect) salaryMaxSelect.value = String(dashboardState.salaryMax);
    }
    selectedDomainName = null;
    applyFiltersAndRender();
  });
  salaryMaxSelect?.addEventListener("change", (e) => {
    dashboardState.salaryMax = Number(e.target.value);
    if (dashboardState.salaryMax < dashboardState.salaryMin) {
      dashboardState.salaryMin = dashboardState.salaryMax;
      if (salaryMinSelect) salaryMinSelect.value = String(dashboardState.salaryMin);
    }
    selectedDomainName = null;
    applyFiltersAndRender();
  });
}

function applyFiltersAndRender(detailOptions = {}) {
  const filtered = filterDomains(currentDomainsSnapshot, dashboardState);
  if (filterSummary) {
    filterSummary.textContent = filtered.length
      ? `Showing ${filtered.length} domain(s) that match your search and filters.`
      : "No domains match your filters. Try clearing the search or widening the salary range.";
  }
  renderDomainCards(filtered, detailOptions);
}

function renderDomainCards(domains, detailOptions = {}) {
  domainList.innerHTML = "";
  if (!domains.length) {
    domainList.innerHTML = "<p class=\"sub\">No domains match your filters.</p>";
    domainDetail.classList.add("hidden");
    return;
  }

  const pick =
    selectedDomainName && domains.some((d) => d.name === selectedDomainName)
      ? selectedDomainName
      : domains[0].name;

  domains.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "domain-btn";
    button.dataset.domainName = item.name;
    if (item.name === pick) {
      button.classList.add("active");
    }
    button.innerHTML = `<strong>${item.name}</strong><br><span class="sub">Tap for detailed view</span>`;
    button.addEventListener("click", () => {
      document.querySelectorAll(".domain-btn").forEach((card) => card.classList.remove("active"));
      button.classList.add("active");
      selectedDomainName = item.name;
      const full = currentDomainsSnapshot.find((d) => d.name === item.name) || item;
      renderDomainDetail(full, { filteredRoles: item._filteredRoles });
    });
    domainList.appendChild(button);
  });

  const first = domains.find((d) => d.name === pick) || domains[0];
  selectedDomainName = first.name;
  const fullDomain = currentDomainsSnapshot.find((d) => d.name === first.name) || first;
  renderDomainDetail(fullDomain, {
    filteredRoles: first._filteredRoles,
    preselectedRoleTitle: detailOptions.preselectedRoleTitle
  });
}

function renderDomainDetail(domain, options = {}) {
  const roleDetails = options.filteredRoles || domain._filteredRoles || normalizeDomainRoles(domain);
  let preIndex = 0;
  if (options.preselectedRoleTitle) {
    const idx = roleDetails.findIndex((r) => r.title === options.preselectedRoleTitle);
    if (idx >= 0) preIndex = idx;
  }

  const roleButtons = roleDetails
    .map(
      (role, index) =>
        `<button type="button" class="role-btn${index === preIndex ? " active" : ""}" data-role-index="${index}">${role.title}</button>`
    )
    .join("");

  domainDetail.innerHTML = `
    <h3>${domain.name}</h3>
    <p class="sub">${domain.domainSummary || "Explore domain opportunities and role-wise outcomes."}</p>
    <h4>Domain outlook</h4>
    <p><span class="future">Future proof (domain):</span> ${domain.futureProof || "—"}</p>
    <p><span class="future">Demand in 5 years (domain):</span> ${domain.demand5Years || "—"}</p>
    <h4>Job Roles</h4>
    <div class="role-grid">${roleButtons}</div>
    <section id="roleDetailPane" class="role-detail"></section>
  `;

  const roleDetailPane = document.getElementById("roleDetailPane");
  const roleButtonsList = domainDetail.querySelectorAll(".role-btn");

  const renderRoleDetail = (role) => {
    const roleSkills = (role.skills || []).map((skill) => `<span class="pill">${skill}</span>`).join("");
    const demandBadge = role.demandLevel || "medium";
    roleDetailPane.innerHTML = `
      <h4>${role.title}</h4>
      <div class="kpi">
        <div><b>Beginner (entry)</b><span>${role.salaryBeginner}</span></div>
        <div><b>Average (mid)</b><span>${role.salaryAverage}</span></div>
        <div><b>Highest (senior)</b><span>${role.salaryHighest}</span></div>
      </div>
      <p class="sub"><span class="future">Future demand (role):</span> ${role.futureDemand}</p>
      <p class="sub demand-reason">${role.futureDemandReason}</p>
      <h4>Required Skills</h4>
      <div>${roleSkills || "<span class=\"sub\">Skills data not available.</span>"}</div>
      <p class="badge-demand ${demandBadge}">${demandBadge} demand</p>
    `;
  };

  roleButtonsList.forEach((btn) => {
    btn.addEventListener("click", () => {
      roleButtonsList.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      const roleIndex = Number(btn.dataset.roleIndex);
      renderRoleDetail(roleDetails[roleIndex]);
    });
  });

  if (roleDetails.length) {
    renderRoleDetail(roleDetails[preIndex]);
  }
  domainDetail.classList.remove("hidden");
}

function renderDashboard(user) {
  authPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  welcomeLine.textContent = `Logged in as ${user.name}`;
  profileLine.textContent = `${user.course} - ${user.specialization}`;

  const domains = (domainData[user.course] && domainData[user.course][user.specialization]) || [];
  if (!domains.length) {
    domainList.innerHTML = "<p class=\"sub\">No domains found for this specialization yet.</p>";
    if (filterSummary) filterSummary.textContent = "";
    if (topRolesList) topRolesList.innerHTML = "<p class=\"sub\">No roles available yet.</p>";
    domainDetail.classList.add("hidden");
    return;
  }

  currentDomainsSnapshot = domains;
  selectedDomainName = null;
  dashboardState.query = "";
  dashboardState.highDemandOnly = false;
  dashboardState.salaryMin = 0;
  dashboardState.salaryMax = 50;
  if (roleSearch) roleSearch.value = "";
  if (filterHighDemand) filterHighDemand.checked = false;
  if (salaryMinSelect) salaryMinSelect.value = "0";
  if (salaryMaxSelect) salaryMaxSelect.value = "50";

  renderTopRecommended(domains);
  bindDashboardFiltersOnce();
  applyFiltersAndRender();
}

loginTab.addEventListener("click", () => showAuth("login"));
registerTab.addEventListener("click", () => showAuth("register"));

courseSelect.addEventListener("change", (event) => {
  populateSpecializations(event.target.value);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("fullName").value.trim();
  const course = courseSelect.value;
  const specialization = specializationSelect.value;
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (!name || !course || !specialization || !username || !password) {
    setAuthMessage("Please fill all registration fields.");
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    setAuthMessage("Username already exists. Please choose another.");
    return;
  }

  const newUser = { name, course, specialization, username, password };
  users.push(newUser);
  saveUsers(users);
  registerForm.reset();
  populateSpecializations("");
  showAuth("login", true);
  setAuthMessage("Registered successfully. Please login.", "#86efac");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const users = getUsers();
  if (!users.length) {
    setAuthMessage("No users found. Please register first.");
    return;
  }

  const user = users.find(
    (item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password
  );

  if (!user) {
    setAuthMessage("Invalid username or password.");
    return;
  }

  clearAuthMessage();
  setActiveUser(user);
  renderDashboard(user);
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(activeUserKey);
  dashboard.classList.add("hidden");
  authPanel.classList.remove("hidden");
  showAuth("login");
});

const activeUser = getActiveUser();
if (activeUser) {
  renderDashboard(activeUser);
}
