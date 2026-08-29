import { Document, Chunk, SimilarCase, QueryRecord, ReportRecord, AuditLogEntry, TopicInsight, TopicTrend, User, UserAccessRequest } from '../types';

export const SEED_USERS: User[] = [
  {
    id: 'usr_vedant_01',
    name: 'Vedant Dike',
    designation: 'Chief Technical Officer & Director (Systems)',
    role: 'admin',
    status: 'approved',
    subsidiary: 'CMPDI HQ',
    email: 'vedantsdike@gmail.com',
    employeeId: 'CIL-HQ-00192',
    department: 'Central Mining Planning & Directorate',
    password: 'Password@123',
    approvedAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 'usr_priya_01',
    name: 'Priya Dike',
    designation: 'General Manager (Mining Operations)',
    role: 'admin',
    status: 'approved',
    subsidiary: 'CMPDI HQ',
    email: 'priyadike23@gmail.com',
    employeeId: 'CIL-HQ-00191',
    department: 'Central Mining Planning & Directorate',
    password: 'Password@123',
    approvedAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 'usr_emp_01',
    name: 'Er. Rajesh Kumar Verma',
    designation: 'Senior Geologist & Planning Officer',
    role: 'employee',
    status: 'approved',
    subsidiary: 'SECL',
    email: 'rajesh.verma@secl.coalindia.in',
    employeeId: 'CIL-SECL-84920',
    department: 'Geology & Exploration Dept.',
    password: 'Password@123',
    approvedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'usr_adm_01',
    name: 'Dr. Arindam Mukherjee',
    designation: 'Chief Mining Engineer & General Manager (R&D)',
    role: 'admin',
    status: 'approved',
    subsidiary: 'CMPDI HQ',
    email: 'arindam.mukherjee@cmpdi.co.in',
    employeeId: 'CMPDI-HQ-10294',
    department: 'Central Mining Planning & Directorate',
    password: 'Password@123',
    approvedAt: '2024-11-01T09:00:00Z',
  },
  {
    id: 'usr_emp_02',
    name: 'Pooja Sharma',
    designation: 'Safety & Environmental Audit Officer',
    role: 'employee',
    status: 'approved',
    subsidiary: 'BCCL',
    email: 'pooja.sharma@bccl.coalindia.in',
    employeeId: 'CIL-BCCL-91244',
    department: 'Safety & DGMS Compliance Cell',
    password: 'Password@123',
    approvedAt: '2025-02-10T14:30:00Z',
  },
  {
    id: 'usr_pending_01',
    name: 'Ananya Sen',
    designation: 'Assistant Manager (Mining Operations)',
    role: 'employee',
    status: 'pending',
    subsidiary: 'CCL',
    email: 'ananya.sen@ccl.coalindia.in',
    employeeId: 'CIL-CCL-39401',
    department: 'Production & Overburden Dispatch',
    password: 'Password@123',
    requestedAt: '2026-08-25T11:20:00Z',
  },
  {
    id: 'usr_rejected_01',
    name: 'Vikram Singh',
    designation: 'Contractual Drilling Supervisor',
    role: 'employee',
    status: 'rejected',
    subsidiary: 'ECL',
    email: 'vikram.singh@ecl.coalindia.in',
    employeeId: 'CIL-ECL-12093',
    department: 'Exploration Field Operations',
    password: 'Password@123',
    requestedAt: '2026-08-20T08:15:00Z',
    rejectedReason: 'Contractor domain clearance requires Area General Manager endorsement.',
  }
];

export const SEED_ACCESS_REQUESTS: UserAccessRequest[] = [
  {
    id: 'req_001',
    name: 'Ananya Sen',
    employeeId: 'CIL-CCL-39401',
    email: 'ananya.sen@ccl.coalindia.in',
    subsidiary: 'CCL',
    department: 'Production & Overburden Dispatch',
    designation: 'Assistant Manager (Mining Operations)',
    role: 'employee',
    status: 'pending',
    requestedAt: '2026-08-25T11:20:00Z',
  },
  {
    id: 'req_002',
    name: 'Vikram Singh',
    employeeId: 'CIL-ECL-12093',
    email: 'vikram.singh@ecl.coalindia.in',
    subsidiary: 'ECL',
    department: 'Exploration Field Operations',
    designation: 'Contractual Drilling Supervisor',
    role: 'employee',
    status: 'rejected',
    requestedAt: '2026-08-20T08:15:00Z',
    rejectedReason: 'Contractor domain clearance requires Area General Manager endorsement.',
  }
];

export const SEED_DOCUMENTS: Document[] = [
  {
    id: 'doc_korba_geo_01',
    title: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
    documentCode: 'CMPDI/GEO/2024/SECL-082',
    subsidiary: 'SECL',
    type: 'geological_report',
    department: 'Exploration & Mine Planning',
    currentVersionId: 'ver_korba_02',
    tags: ['Korba', 'Reserve Estimation', 'Seam IV', 'Grade G7', 'Core Drilling'],
    status: 'approved',
    createdAt: '2024-03-15T09:30:00Z',
    lastUpdated: '2024-07-22T14:15:00Z',
    versions: [
      {
        id: 'ver_korba_01',
        documentId: 'doc_korba_geo_01',
        versionNumber: 1,
        fileName: 'CMPDI_Korba_West_Geology_v1.0_2023.pdf',
        fileSize: '14.2 MB',
        reasonForChange: 'Initial exploratory borehole reserve calculation based on 18 core samples.',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'SECL',
        },
        uploadedAt: '2023-11-10T10:00:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2023-11-14T16:20:00Z',
        extractedText: 'Exploratory drilling across Sector-B Korba West indicates provable coal reserves of 42.8 MT with mean seam thickness of 6.2m at depth 180m-240m. Ash content average 34.2% classified under GCV Grade G8.',
        ocrConfidence: 98.4,
        keyMetrics: [
          { label: 'Proved Reserves', value: '42.8 MT' },
          { label: 'Mean Seam Thickness', value: '6.2 meters' },
          { label: 'Average Ash Content', value: '34.2%' },
          { label: 'Gross Calorific Value (GCV)', value: '3820 kcal/kg (Grade G8)' },
        ],
        extractedTables: [
          {
            id: 'tbl_korba_v1',
            sheetName: 'Borehole_Reserves_Summary',
            headers: ['Borehole ID', 'Depth From (m)', 'Depth To (m)', 'Seam Width (m)', 'Ash %', 'Moisture %', 'GCV (kcal/kg)'],
            rows: [
              ['BH-KW-01', 182.4, 188.8, 6.4, 33.8, 6.2, 3850],
              ['BH-KW-02', 194.1, 200.2, 6.1, 34.6, 5.9, 3790],
              ['BH-KW-03', 215.0, 221.5, 6.5, 34.1, 6.1, 3820],
              ['BH-KW-04', 238.2, 244.0, 5.8, 34.4, 6.0, 3810],
            ],
            summary: 'Initial 4-point exploratory borehole data for Korba West Sector B.'
          }
        ]
      },
      {
        id: 'ver_korba_02',
        documentId: 'doc_korba_geo_01',
        versionNumber: 2,
        fileName: 'CMPDI_Korba_West_Geology_Final_v2.0_2024.pdf',
        fileSize: '18.6 MB',
        reasonForChange: 'Incorporation of 12 additional deep directional core boreholes showing higher quality G7 coal in southern block and updated proved reserve of 51.4 MT (+8.6 MT upward revision).',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'SECL',
        },
        uploadedAt: '2024-07-20T11:45:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2024-07-22T14:15:00Z',
        extractedText: 'Comprehensive 30-borehole analysis for Korba West Seam IV/V confirms total proved geological reserve of 51.4 Million Tonnes (MT) and indicated reserve of 16.2 MT. Average ash content improved to 31.8%, reclassifying reserve as GCV Grade G7 (4050 kcal/kg). Moisture content 5.4%, volatile matter 26.8%. Strip ratio calculated at 1:3.82 m³/t.',
        ocrConfidence: 99.2,
        keyMetrics: [
          { label: 'Proved Reserves', value: '51.4 MT', variance: '+20.1% vs v1' },
          { label: 'Mean Seam Thickness', value: '6.8 meters', variance: '+0.6m vs v1' },
          { label: 'Average Ash Content', value: '31.8%', variance: '-2.4% (Higher Quality)' },
          { label: 'Gross Calorific Value (GCV)', value: '4050 kcal/kg (Grade G7)', variance: 'Upgraded from G8' },
          { label: 'Stripping Ratio', value: '1:3.82 m³/t' },
        ],
        extractedTables: [
          {
            id: 'tbl_korba_v2_reserves',
            sheetName: 'Seam_IV_V_Reserve_Block_2024',
            headers: ['Block / Sector', 'Boreholes Count', 'Proved Reserves (MT)', 'Indicated (MT)', 'Avg Thickness (m)', 'Ash %', 'Grade'],
            rows: [
              ['Sector A (North)', 10, 18.2, 5.4, 6.5, 32.1, 'G7'],
              ['Sector B (Central)', 12, 21.6, 6.2, 7.1, 31.2, 'G7'],
              ['Sector C (Deep South)', 8, 11.6, 4.6, 6.9, 32.4, 'G7'],
              ['Total / Composite', 30, 51.4, 16.2, 6.8, 31.8, 'G7 (4050 kcal/kg)'],
            ],
            summary: 'Official approved reserve statement for Korba West deep drilling campaign.'
          }
        ]
      },
      {
        id: 'ver_korba_03',
        documentId: 'doc_korba_geo_01',
        versionNumber: 3,
        fileName: 'CMPDI_Korba_West_Geology_Draft_v3.0_Amendment.pdf',
        fileSize: '19.1 MB',
        reasonForChange: 'Hydro-geological assessment amendment proposing high-wall mining boundary alteration due to water table recharge zone in Sector C.',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'SECL',
        },
        uploadedAt: '2026-08-25T08:30:00Z',
        approvalStatus: 'pending',
        approvalPriority: 'urgent',
        aiRiskReason: 'This update changes the mineable reserve boundary in Sector C by 4.2 MT and alters groundwater recharge setback constraints affecting ongoing statutory environmental filings.',
        extractedText: 'Amendment draft: Infiltration testing indicates shallow aquifer recharge zone in Sector C along Hasdeo tributary. Recommended safety setback of 150m reduces extractable opencast reserves from 51.4 MT to 47.2 MT unless underground continuous miner method is deployed.',
        ocrConfidence: 98.7,
        keyMetrics: [
          { label: 'Proved Reserves', value: '47.2 MT (Amended)', variance: '-4.2 MT for environmental buffer' },
          { label: 'Water Setback Barrier', value: '150 meters from Hasdeo tributary' },
        ],
      }
    ]
  },
  {
    id: 'doc_jharia_fire_02',
    title: 'Jharia Coalfield Fire Control & Surface Sealing Operational Protocol',
    documentCode: 'BCCL/SFT/2024/JCF-041',
    subsidiary: 'BCCL',
    type: 'safety_sop',
    department: 'Safety & DGMS Compliance Cell',
    currentVersionId: 'ver_jharia_03',
    tags: ['Jharia', 'Mine Fire', 'Surface Sealing', 'Nitrogen Flushing', 'DGMS Circular'],
    status: 'approved',
    createdAt: '2023-01-18T08:00:00Z',
    lastUpdated: '2024-05-10T12:00:00Z',
    versions: [
      {
        id: 'ver_jharia_03',
        documentId: 'doc_jharia_fire_02',
        versionNumber: 3,
        fileName: 'BCCL_Jharia_Fire_Management_Protocol_v3.pdf',
        fileSize: '8.4 MB',
        reasonForChange: 'Mandatory DGMS 2024 revision: Nitrogen injection flow rates increased to 1200 m³/hr and mandatory thermal drone scanning every 72 hours over sealed fire zones XII and XIII.',
        uploadedBy: {
          id: 'usr_emp_02',
          name: 'Pooja Sharma',
          employeeId: 'CIL-BCCL-91244',
          subsidiary: 'BCCL',
        },
        uploadedAt: '2024-05-08T10:30:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2024-05-10T12:00:00Z',
        extractedText: 'Standard Operating Procedure for containment of active subsurface coal fires in Lodna & Kusunda areas (Jharia). Inert gas infusion: Liquid Nitrogen vaporization and infusion at sustained rate of 1200 m³/hr through 150mm borehole casing. Surface blanketing using fly-ash sand slurry mix (1:3 ratio) minimum 2.5m thick. Surface temperature threshold fixed at 45°C. Any reading above 60°C mandates immediate exclusion zone expansion of 100m.',
        ocrConfidence: 99.5,
        keyMetrics: [
          { label: 'Nitrogen Infusion Rate', value: '1,200 m³/hr sustained' },
          { label: 'Fly-Ash Sand Slurry Ratio', value: '1:3 ratio (2.5m thickness)' },
          { label: 'Max Allowable Surface Temp', value: '45.0 °C' },
          { label: 'Thermal Drone Survey Interval', value: 'Every 72 hours' }
        ],
        extractedTables: [
          {
            id: 'tbl_jharia_temp_thresholds',
            sheetName: 'Fire_Monitoring_Thresholds',
            headers: ['Zone Category', 'Subsurface Temp (°C)', 'CO/O₂ Deficit Ratio (Graham Index)', 'Action Protocol', 'Monitoring Frequency'],
            rows: [
              ['Normal / Dormant', '< 50°C', '< 0.2%', 'Continuous tele-monitoring', 'Daily'],
              ['Elevated / Incipient Heating', '50°C - 80°C', '0.2% - 0.5%', 'Nitrogen injection 600 m³/hr + Fly ash seal', 'Every 12 hours'],
              ['Active Subsurface Fire', '> 80°C', '> 0.5%', 'High-pressure N₂ injection 1200 m³/hr + Slurry trench barrier', 'Continuous real-time'],
            ],
            summary: 'DGMS-mandated operational threshold limits for Jharia underground fire containment.'
          }
        ]
      }
    ]
  },
  {
    id: 'doc_gevra_slope_03',
    title: 'Gevra Mega Opencast Project Bench Slope Stability & Highwall SOP',
    documentCode: 'SECL/OPC/2024/GEV-109',
    subsidiary: 'SECL',
    type: 'mine_plan',
    department: 'Mine Operations & Safety',
    currentVersionId: 'ver_gevra_01',
    tags: ['Gevra', 'Slope Stability', 'Slope Stability Radar (SSR)', 'Factor of Safety', 'Highwall'],
    status: 'approved',
    createdAt: '2024-02-12T11:00:00Z',
    lastUpdated: '2024-02-14T15:30:00Z',
    versions: [
      {
        id: 'ver_gevra_01',
        documentId: 'doc_gevra_slope_03',
        versionNumber: 1,
        fileName: 'SECL_Gevra_Slope_Stability_SOP_v1.0.pdf',
        fileSize: '11.8 MB',
        reasonForChange: 'Approved baseline slope design parameters for 70 MTPA expansion pit depth reaching 280 meters.',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'SECL',
        },
        uploadedAt: '2024-02-12T11:00:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2024-02-14T15:30:00Z',
        extractedText: 'Operational guidelines for Gevra OC mine expansion. Overall slope angle must not exceed 38 degrees for sandstone overburden formations and 28 degrees in weathered zones. Factor of Safety (FoS) must be maintained at minimum 1.35 under saturated monsoon conditions. Continuous Slope Stability Radar (SSR) monitoring deployed with critical velocity alarm threshold set at 2.5 mm/hr slope displacement.',
        ocrConfidence: 99.1,
        keyMetrics: [
          { label: 'Overall Pit Slope Angle', value: '38° (Hard Overburden) / 28° (Weathered)' },
          { label: 'Minimum Factor of Safety (FoS)', value: '1.35 (Saturated Monsoon)' },
          { label: 'Critical Radar Displacement Trigger', value: '2.5 mm/hour' },
          { label: 'Bench Height / Width Ratio', value: '15m Height : 22m Catch Berm' }
        ]
      }
    ]
  },
  {
    id: 'doc_singrauli_hemm_04',
    title: 'NCL Singrauli Heavy Earth Moving Machinery (HEMM) Fleet Productivity & Diesel Audit',
    documentCode: 'NCL/HEMM/2024/AUD-019',
    subsidiary: 'NCL',
    type: 'production_sheet',
    department: 'Excavation & Mechanical Engineering',
    currentVersionId: 'ver_singrauli_01',
    tags: ['NCL', 'Singrauli', 'HEMM', 'Dumpers', 'Shovels', 'Diesel Specific Consumption', 'Overburden'],
    status: 'approved',
    createdAt: '2024-04-10T09:15:00Z',
    lastUpdated: '2024-04-12T16:00:00Z',
    versions: [
      {
        id: 'ver_singrauli_01',
        documentId: 'doc_singrauli_hemm_04',
        versionNumber: 1,
        fileName: 'NCL_Singrauli_HEMM_Audit_2024_Q1.xlsx',
        fileSize: '6.7 MB',
        reasonForChange: 'Quarterly statutory energy efficiency and equipment availability report across Jayant, Nigahi, and Dudhichua open cast projects.',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'NCL',
        },
        uploadedAt: '2024-04-10T09:15:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2024-04-12T16:00:00Z',
        extractedText: 'Comprehensive equipment productivity audit for Northern Coalfields Limited. Overall fleet availability of 240T Dumpers averaged 84.2% against target of 80%. Electric Rope Shovels (42m³) recorded specific energy consumption of 0.38 kWh/m³ OB handled. Specific diesel consumption in 240T Dumpers averaged 0.62 Litres per tonne-km in Jayant Project.',
        ocrConfidence: 99.8,
        keyMetrics: [
          { label: '240T Dumper Availability', value: '84.2%' },
          { label: '42m³ Shovel Energy Rate', value: '0.38 kWh / m³ OB' },
          { label: 'Specific Diesel Consumption', value: '0.62 L / t-km' },
          { label: 'Total OB Handled Q1', value: '112.4 Million m³' }
        ],
        extractedTables: [
          {
            id: 'tbl_hemm_fleet',
            sheetName: 'HEMM_Project_Performance_Q1',
            headers: ['Project Name', 'Fleet Category', 'Active Units', 'Availability (%)', 'Utilization (%)', 'Diesel Rate (L/t-km)', 'Production (MT)'],
            rows: [
              ['Jayant OCP', '240T Dumpers + 42m³ Shovels', 48, 86.4, 74.2, 0.61, 6.84],
              ['Nigahi OCP', '240T Dumpers + 42m³ Shovels', 42, 83.1, 71.8, 0.64, 5.92],
              ['Dudhichua OCP', '190T Dumpers + 20m³ Shovels', 54, 84.8, 73.0, 0.62, 5.75],
              ['Amlohri OCP', '240T Dumpers + Draglines', 36, 82.5, 70.4, 0.60, 4.10],
            ],
            summary: 'NCL subsidiary HEMM performance indicators audit data Q1 2024-25.'
          }
        ]
      }
    ]
  },
  {
    id: 'doc_dgms_safety_05',
    title: 'CIL Comprehensive Standard Guidelines for Inundation & Mine Ventilation (DGMS Align)',
    documentCode: 'CIL/DGMS/2023/SFT-004',
    subsidiary: 'CMPDI HQ',
    type: 'safety_sop',
    department: 'Safety & DGMS Compliance Cell',
    currentVersionId: 'ver_dgms_02',
    tags: ['DGMS', 'Ventilation', 'Methane', 'Inundation', 'Statutory Standards', 'Carbon Monoxide'],
    status: 'approved',
    createdAt: '2023-08-01T10:00:00Z',
    lastUpdated: '2023-12-05T14:00:00Z',
    versions: [
      {
        id: 'ver_dgms_02',
        documentId: 'doc_dgms_safety_05',
        versionNumber: 2,
        fileName: 'CIL_Safety_Standard_Guidelines_DGMS_2023.pdf',
        fileSize: '15.4 MB',
        reasonForChange: 'Incorporation of real-time Tele-monitoring thresholds: Automatic electric power cutoff trigger at 1.25% CH₄ concentration in return airway and 30 ppm CO at face.',
        uploadedBy: {
          id: 'usr_emp_02',
          name: 'Pooja Sharma',
          employeeId: 'CIL-BCCL-91244',
          subsidiary: 'CMPDI HQ',
        },
        uploadedAt: '2023-12-01T09:00:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2023-12-05T14:00:00Z',
        extractedText: 'Directorate General of Mines Safety (DGMS) statutory standard mandates minimum air quantity of 6 m³/minute for every person employed in the largest shift or 2.5 m³/minute per daily tonne of coal output, whichever is greater. Inflammable gas (Methane) cutoff limits: All electrical apparatus must de-energize automatically when inflammable gas reaches 1.25% in the general body of air. Maximum permissible Carbon Monoxide (CO) concentration is 50 ppm for 8-hour exposure, with instantaneous alarm trigger at 30 ppm.',
        ocrConfidence: 99.7,
        keyMetrics: [
          { label: 'Minimum Airflow Rate', value: '6.0 m³/min per person or 2.5 m³/min per daily tonne' },
          { label: 'Methane (CH₄) Power Cutoff Limit', value: '1.25% in general body of air' },
          { label: 'Carbon Monoxide Alarm Trigger', value: '30 ppm instantaneous / 50 ppm 8-hr' },
          { label: 'Inundation Danger Barrier', value: '60 meters from waterlogged old workings' }
        ]
      }
    ]
  },
  {
    id: 'doc_piprawar_cpp_06',
    title: 'CCL Piprawar Coal Preparation Plant (CPP) Washery Yield & Ash Reduction Audit',
    documentCode: 'CCL/CPP/2024/WAS-011',
    subsidiary: 'CCL',
    type: 'production_sheet',
    department: 'Coal Beneficiation & Washeries',
    currentVersionId: 'ver_piprawar_01',
    tags: ['CCL', 'Piprawar', 'Washery', 'Heavy Media Cyclone', 'Clean Coal Yield', 'Ash Reduction'],
    status: 'approved',
    createdAt: '2024-06-01T08:30:00Z',
    lastUpdated: '2024-06-04T11:00:00Z',
    versions: [
      {
        id: 'ver_piprawar_01',
        documentId: 'doc_piprawar_cpp_06',
        versionNumber: 1,
        fileName: 'CCL_Piprawar_CPP_Efficiency_Report_2024.pdf',
        fileSize: '9.3 MB',
        reasonForChange: 'Quarterly evaluation of Dense Medium Cyclones (DMC) performance processing 6.5 MTPA raw non-coking coal.',
        uploadedBy: {
          id: 'usr_emp_01',
          name: 'Er. Rajesh Kumar Verma',
          employeeId: 'CIL-SECL-84920',
          subsidiary: 'CCL',
        },
        uploadedAt: '2024-06-01T08:30:00Z',
        approvalStatus: 'approved',
        approvedBy: {
          id: 'usr_adm_01',
          name: 'Dr. Arindam Mukherjee',
        },
        approvedAt: '2024-06-04T11:00:00Z',
        extractedText: 'Piprawar Coal Preparation Plant processed 1.62 MT raw coal during Q1. Raw coal average feed ash of 41.2% was upgraded to washed clean coal with 33.4% ash (reduction of 7.8% ash) at a clean coal yield of 76.8%. Magnetite consumption stood at 0.88 kg per tonne of feed, beating the benchmark target of 0.95 kg/t.',
        ocrConfidence: 98.9,
        keyMetrics: [
          { label: 'Clean Coal Yield', value: '76.8%' },
          { label: 'Feed Ash vs Clean Ash', value: '41.2% → 33.4% (-7.8% Ash)' },
          { label: 'Magnetite Consumption', value: '0.88 kg / tonne feed' },
          { label: 'Throughput Capacity', value: '6.5 MTPA' }
        ]
      }
    ]
  }
];

export const SEED_CHUNKS: Chunk[] = [
  {
    id: 'chk_korba_reserves',
    documentId: 'doc_korba_geo_01',
    documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
    documentCode: 'CMPDI/GEO/2024/SECL-082',
    documentVersionId: 'ver_korba_02',
    versionNumber: 2,
    subsidiary: 'SECL',
    pageOrSheetRef: 'Page 14, Section 3.2 (Geological Reserve Synthesis)',
    topicTag: 'Reserve Estimation',
    isApproved: true,
    text: 'Comprehensive 30-borehole analysis for Korba West Seam IV/V confirms total proved geological reserve of 51.4 Million Tonnes (MT) and indicated reserve of 16.2 MT. Average ash content is 31.8%, reclassifying reserve as GCV Grade G7 (4050 kcal/kg). Mean seam thickness is 6.8 meters across depths 180m to 240m. Stripping ratio calculated at 1:3.82 m³/t.'
  },
  {
    id: 'chk_korba_sectors',
    documentId: 'doc_korba_geo_01',
    documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
    documentCode: 'CMPDI/GEO/2024/SECL-082',
    documentVersionId: 'ver_korba_02',
    versionNumber: 2,
    subsidiary: 'SECL',
    pageOrSheetRef: 'Sheet "Seam_IV_V_Reserve_Block_2024", Rows 4-8',
    topicTag: 'Reserve Estimation',
    isApproved: true,
    text: 'Sector A (North): 18.2 MT Proved (Ash 32.1%). Sector B (Central): 21.6 MT Proved (Ash 31.2%, Seam Thickness 7.1m). Sector C (Deep South): 11.6 MT Proved (Ash 32.4%). Total composite proved reserve: 51.4 MT.'
  },
  {
    id: 'chk_jharia_n2_rate',
    documentId: 'doc_jharia_fire_02',
    documentTitle: 'Jharia Coalfield Fire Control & Surface Sealing Operational Protocol',
    documentCode: 'BCCL/SFT/2024/JCF-041',
    documentVersionId: 'ver_jharia_03',
    versionNumber: 3,
    subsidiary: 'BCCL',
    pageOrSheetRef: 'Page 8, Protocol 4.1 (Inert Gas Infusion Rates)',
    topicTag: 'Mine Fire Control',
    isApproved: true,
    text: 'Liquid Nitrogen vaporization and infusion must be maintained at a sustained rate of 1200 m³/hr through 150mm borehole casing into sealed active fire zones XII and XIII. Surface blanketing using fly-ash sand slurry mix (1:3 ratio) must maintain minimum 2.5m thickness.'
  },
  {
    id: 'chk_jharia_temp_thresholds',
    documentId: 'doc_jharia_fire_02',
    documentTitle: 'Jharia Coalfield Fire Control & Surface Sealing Operational Protocol',
    documentCode: 'BCCL/SFT/2024/JCF-041',
    documentVersionId: 'ver_jharia_03',
    versionNumber: 3,
    subsidiary: 'BCCL',
    pageOrSheetRef: 'Page 12, Table 2 (Fire Monitoring Threshold Limits)',
    topicTag: 'Mine Fire Control',
    isApproved: true,
    text: 'Surface temperature threshold is fixed at 45°C. Any thermal drone reading above 60°C mandates immediate exclusion zone expansion of 100m. If subsurface temperature exceeds 80°C or Graham CO/O2 deficit ratio exceeds 0.5%, high-pressure N2 injection of 1200 m³/hr and slurry trench barriers must be deployed immediately.'
  },
  {
    id: 'chk_gevra_slope_angle',
    documentId: 'doc_gevra_slope_03',
    documentTitle: 'Gevra Mega Opencast Project Bench Slope Stability & Highwall SOP',
    documentCode: 'SECL/OPC/2024/GEV-109',
    documentVersionId: 'ver_gevra_01',
    versionNumber: 1,
    subsidiary: 'SECL',
    pageOrSheetRef: 'Page 6, Section 2 (Bench Geometry & Factor of Safety)',
    topicTag: 'Slope Stability',
    isApproved: true,
    text: 'Overall slope angle must not exceed 38 degrees for sandstone overburden formations and 28 degrees in weathered zones. Factor of Safety (FoS) must be maintained at minimum 1.35 under saturated monsoon conditions. Continuous Slope Stability Radar (SSR) alarm triggers at 2.5 mm/hr velocity.'
  },
  {
    id: 'chk_dgms_ventilation_limits',
    documentId: 'doc_dgms_safety_05',
    documentTitle: 'CIL Comprehensive Standard Guidelines for Inundation & Mine Ventilation (DGMS Align)',
    documentCode: 'CIL/DGMS/2023/SFT-004',
    documentVersionId: 'ver_dgms_02',
    versionNumber: 2,
    subsidiary: 'CMPDI HQ',
    pageOrSheetRef: 'Page 19, Clause 14 (Statutory Airflow & Methane Cutoff)',
    topicTag: 'DGMS Safety Standards',
    isApproved: true,
    text: 'DGMS standard mandates minimum airflow of 6 m³/min per person in largest shift or 2.5 m³/min per daily tonne output. Automatic electric power cutoff to all underground machinery occurs when Methane (CH4) reaches 1.25% in general body of air. Carbon Monoxide (CO) alarm threshold is set at 30 ppm instantaneous.'
  },
  {
    id: 'chk_singrauli_dumper_audit',
    documentId: 'doc_singrauli_hemm_04',
    documentTitle: 'NCL Singrauli Heavy Earth Moving Machinery (HEMM) Fleet Productivity & Diesel Audit',
    documentCode: 'NCL/HEMM/2024/AUD-019',
    documentVersionId: 'ver_singrauli_01',
    versionNumber: 1,
    subsidiary: 'NCL',
    pageOrSheetRef: 'Sheet "HEMM_Project_Performance_Q1", Rows 2-6',
    topicTag: 'Equipment Efficiency',
    isApproved: true,
    text: '240T Dumper fleet availability averaged 84.2% across NCL projects (Jayant 86.4%, Nigahi 83.1%, Dudhichua 84.8%). Specific diesel consumption in Jayant OCP stood at 0.61 L/t-km with 42m³ Electric Shovels consuming 0.38 kWh/m³ overburden.'
  },
  {
    id: 'chk_piprawar_washery_yield',
    documentId: 'doc_piprawar_cpp_06',
    documentTitle: 'CCL Piprawar Coal Preparation Plant (CPP) Washery Yield & Ash Reduction Audit',
    documentCode: 'CCL/CPP/2024/WAS-011',
    documentVersionId: 'ver_piprawar_01',
    versionNumber: 1,
    subsidiary: 'CCL',
    pageOrSheetRef: 'Page 5, Executive Summary (Yield & Medium Consumption)',
    topicTag: 'Coal Beneficiation',
    isApproved: true,
    text: 'Piprawar Coal Preparation Plant achieved clean coal yield of 76.8% with raw feed ash reducing from 41.2% to 33.4% (-7.8% ash). Specific magnetite consumption was measured at 0.88 kg/tonne of feed against target 0.95 kg/t.'
  }
];

export const SEED_SIMILAR_CASES: SimilarCase[] = [
  {
    id: 'sim_case_01',
    topic: 'Subsurface Fire Containment via Hydro-Fly Ash Sand Slurry Injection',
    title: 'Lodna Seam X Spontaneous Fire Barrier',
    year: 2022,
    subsidiary: 'BCCL',
    confidence: 94,
    outcome: 'Resolved (Temp normalized to 38°C)',
    summary: 'Spontaneous combustion detected in Lodna Seam X outcrop was neutralized via 1:3 fly-ash sand slurry barrier and 1,000 m³/hr Nitrogen purging.',
    referenceDocCode: 'CMPDI/SOP/2025/BCCL-009',
    tags: ['Fire Containment', 'Fly Ash Slurry', 'BCCL', 'Lodna', 'Nitrogen Purging'],
    issueDescription: 'Spontaneous combustion detected in Lodna Seam X outcrop with surface subsidence fissures emitting smoke and CO at 120 ppm.',
    resolution: 'Deployed 1:3 fly-ash sand slurry barrier with 1,000 m³/hr Nitrogen purging through 12 dedicated deep boreholes over 45 days. Temperature reduced from 145°C to 38°C.',
    sourceDocName: 'BCCL_Lodna_Fire_Intervention_Report_2022.pdf',
    sourcePageRef: 'p. 38, Section 5.4',
    keyTakeaway: 'Surface blanket thickness must exceed 2.0m to prevent oxygen ingress through weathering fissures.'
  },
  {
    id: 'sim_case_02',
    topic: 'Highwall Slope Failure Remediation & Water Table Depressurization',
    title: 'Dipka Opencast Highwall Slope Stabilization',
    year: 2021,
    subsidiary: 'SECL',
    confidence: 89,
    outcome: 'Stabilized (FoS improved from 1.08 to 1.34)',
    summary: 'Tension cracks along Eastern highwall mitigated by horizontal sub-surface drain holes and bench angle reduction.',
    referenceDocCode: 'CMPDI/GEO/2024/SECL-082',
    tags: ['Slope Stability', 'Highwall', 'Water Table Depressurization', 'SECL', 'Dipka'],
    issueDescription: 'Tension cracks of 45mm opening observed along Eastern highwall of Dipka Opencast Project during peak August monsoon rainfall.',
    resolution: 'Immediate installation of 8 horizontal sub-surface drain holes (120m depth) for aquifer depressurization + bench flattening from 42° to 34°. SSR radar monitored until displacement stabilized at 0.1 mm/day.',
    sourceDocName: 'CMPDI_Slope_Failure_Remediation_Dipka_2021.pdf',
    sourcePageRef: 'p. 19, Plate IV',
    keyTakeaway: 'Horizontal drain depressurization prevented a projected 250,000 m³ mass bench slide.'
  },
  {
    id: 'sim_case_03',
    topic: 'Underground Heavy Inundation Prevention near Submerged Abandoned Workings',
    title: 'Raniganj Heavy Inundation Prevention & Barrier Pillars',
    year: 2020,
    subsidiary: 'ECL',
    confidence: 91,
    outcome: 'Zero Ingress (DGMS 60m Barrier Maintained)',
    summary: 'Face approaching within 75m of abandoned workings secured with 60m mandatory safety barrier and burn-cut pilot boreholes.',
    referenceDocCode: 'CMPDI/NCL/2025/ENV-014',
    tags: ['Inundation Prevention', 'DGMS Safety Barrier', 'Water Influx', 'ECL', 'Hydrogeology'],
    issueDescription: 'Exploratory face at Raniganj seam approached within 75m of unmapped 1960s submerged waterlogged workings.',
    resolution: 'Enforced DGMS 60-meter mandatory safety barrier + 4 long-hole advance burn-cut pilot boreholes with high-pressure blow-out preventers prior to every 2m face advance.',
    sourceDocName: 'ECL_Raniganj_Inundation_Safety_Case_Study_2020.pdf',
    sourcePageRef: 'p. 52, Clause 8',
    keyTakeaway: 'Pilot advance drilling with mechanical packers is mandatory when within 100m of water body.'
  },
  {
    id: 'sim_case_04',
    topic: '240T Electric Dumper Fuel Optimization via Telematics Payload Balancing',
    title: 'Jayant OCP Haul Road Optimization',
    year: 2023,
    subsidiary: 'NCL',
    confidence: 86,
    outcome: 'Optimized (-11.2% diesel consumption)',
    summary: 'Specific diesel consumption reduced through 1:16 grade smoothing and dynamic shovel fleet management dispatch.',
    referenceDocCode: 'CMPDI/PROD/2026/SECL-Q1',
    tags: ['Fuel Optimization', 'Fleet Management', 'Haul Road', 'NCL', 'Jayant'],
    issueDescription: 'Excessive specific diesel consumption (0.74 L/t-km vs 0.62 target) identified due to haul road gradient mismatch and truck queuing.',
    resolution: 'Re-graded main haul ramp to consistent 1:16 grade + deployed automated Fleet Management Dispatch System (FMS) with dynamic shovel allocation.',
    sourceDocName: 'NCL_Fuel_Audit_Energy_Efficiency_2023.pdf',
    sourcePageRef: 'p. 14, Table 3',
    keyTakeaway: 'Even 1% grade smoothing on 2km haul road cuts fleet diesel consumption by 11.2%.'
  }
];

export const SEED_QUERIES: QueryRecord[] = [
  {
    id: 'qry_01',
    userId: 'usr_emp_01',
    userName: 'Er. Rajesh Kumar Verma',
    userRole: 'employee',
    questionText: 'What is the approved proved coal reserve figure and grade for Korba West Seam IV/V?',
    answerText: 'According to the official geological assessment (v2.0), the total proved coal reserve for Korba West Seam IV/V is **51.4 Million Tonnes (MT)**, with an additional indicated reserve of 16.2 MT across depths 180m to 240m. The average ash content is 31.8%, which categorizes the coal as **GCV Grade G7 (4050 kcal/kg)** with a mean seam thickness of 6.8 meters.',
    aiSummary: 'Korba West proved reserve is confirmed at 51.4 MT (Grade G7, 4050 kcal/kg, 31.8% ash) across 30 approved boreholes.',
    confidence: 99.2,
    foundInKnowledgeBase: true,
    isStale: false,
    draftReply: 'Ministry of Coal / Rajya Sabha Question Ref: As per CMPDI approved geological assessment CMPDI/GEO/2024/SECL-082 (v2), the proved geological reserve in Korba West Seam IV/V stands at 51.4 MT of G7 grade coal.',
    citations: [
      {
        chunkId: 'chk_korba_reserves',
        documentId: 'doc_korba_geo_01',
        documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
        documentCode: 'CMPDI/GEO/2024/SECL-082',
        versionNumber: 2,
        pageOrSheetRef: 'Page 14, Section 3.2 (Geological Reserve Synthesis)',
        excerpt: 'Comprehensive 30-borehole analysis for Korba West Seam IV/V confirms total proved geological reserve of 51.4 Million Tonnes (MT) and indicated reserve of 16.2 MT. Average ash content is 31.8%, reclassifying reserve as GCV Grade G7 (4050 kcal/kg).',
        relevanceScore: 0.98,
        subsidiary: 'SECL'
      }
    ],
    createdAt: '2026-08-25T11:20:00Z',
    viewCount: 14
  },
  {
    id: 'qry_02',
    userId: 'usr_emp_02',
    userName: 'Pooja Sharma',
    userRole: 'employee',
    questionText: 'What is the mandatory liquid nitrogen infusion rate and maximum allowable surface temperature for Jharia mine fire zones?',
    answerText: 'Under the DGMS-approved operational protocol (BCCL/SFT/2024/JCF-041 v3), the liquid nitrogen vaporization and infusion rate must be maintained at a sustained rate of **1,200 m³/hr** through 150mm borehole casing. The maximum allowable surface temperature is fixed at **45.0°C**; any thermal drone reading exceeding 60.0°C triggers an immediate mandatory 100m exclusion zone expansion.',
    aiSummary: 'Jharia protocol mandates 1,200 m³/hr Nitrogen infusion rate and 45.0°C surface temperature threshold (60°C triggers 100m evacuation).',
    confidence: 99.5,
    foundInKnowledgeBase: true,
    isStale: false,
    citations: [
      {
        chunkId: 'chk_jharia_n2_rate',
        documentId: 'doc_jharia_fire_02',
        documentTitle: 'Jharia Coalfield Fire Control & Surface Sealing Operational Protocol',
        documentCode: 'BCCL/SFT/2024/JCF-041',
        versionNumber: 3,
        pageOrSheetRef: 'Page 8, Protocol 4.1 (Inert Gas Infusion Rates)',
        excerpt: 'Liquid Nitrogen vaporization and infusion must be maintained at a sustained rate of 1200 m³/hr through 150mm borehole casing into sealed active fire zones XII and XIII.',
        relevanceScore: 0.99,
        subsidiary: 'BCCL'
      }
    ],
    createdAt: '2026-08-24T14:10:00Z',
    viewCount: 22
  },
  {
    id: 'qry_03_stale',
    userId: 'usr_emp_01',
    userName: 'Er. Rajesh Kumar Verma',
    userRole: 'employee',
    questionText: 'What was the initial borehole reserve estimate for Korba West in early 2023?',
    answerText: 'The initial 2023 exploratory drilling estimate was 42.8 MT based on 18 core samples under Grade G8 (Ash 34.2%).',
    aiSummary: 'Historical v1 reserve estimate was 42.8 MT.',
    confidence: 92.0,
    foundInKnowledgeBase: true,
    isStale: true,
    staleReason: 'Source document version has been upgraded to v2.0 (51.4 MT). Revalidation with current approved version is recommended.',
    citations: [
      {
        chunkId: 'chk_korba_reserves_v1',
        documentId: 'doc_korba_geo_01',
        documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
        documentCode: 'CMPDI/GEO/2024/SECL-082',
        versionNumber: 1,
        pageOrSheetRef: 'Page 4, Section 1.1',
        excerpt: 'Exploratory drilling across Sector-B Korba West indicates provable coal reserves of 42.8 MT with mean seam thickness of 6.2m.',
        relevanceScore: 0.88,
        subsidiary: 'SECL'
      }
    ],
    createdAt: '2024-01-10T09:00:00Z',
    viewCount: 6
  }
];

export const SEED_REPORTS: ReportRecord[] = [
  {
    id: 'rep_01',
    title: 'SECL & NCL Quarterly Heavy Mining Operations & Geological Alignment Brief',
    reportCode: 'REP/CIL/2024/Q1-094',
    type: 'monthly_production_variance',
    period: 'Q1 FY 2024-25',
    subsidiary: 'SECL',
    generatedBy: {
      id: 'usr_emp_01',
      name: 'Er. Rajesh Kumar Verma',
      role: 'employee'
    },
    sourceDocuments: [
      {
        id: 'doc_korba_geo_01',
        title: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
        versionNumber: 2,
        pageOrSheetRef: 'Page 14, Section 3.2'
      },
      {
        id: 'doc_singrauli_hemm_04',
        title: 'NCL Singrauli Heavy Earth Moving Machinery Fleet Productivity & Diesel Audit',
        versionNumber: 1,
        pageOrSheetRef: 'Sheet HEMM_Project_Performance_Q1'
      }
    ],
    summaryExecutive: 'Consolidated statutory audit of proved coal reserve additions in Korba West (+8.6 MT upward revision to 51.4 MT G7 coal) matched against heavy machinery utilization benchmarks across central subsidiaries.',
    content: `## 1. Executive Summary & Statutory Authority
This operational briefing has been generated in accordance with CIL standard operating directives. Data sources are strictly bounded to approved technical filings from CMPDI Exploration Division and NCL Excavation Audits.

## 2. Geological Reserve Additions (Korba West)
Based on CMPDI/GEO/2024/SECL-082 v2.0 (Page 14), total proved geological reserve in Korba West Seam IV/V stands validated at **51.4 MT** with 31.8% average ash content, classifying the block under GCV Grade G7 (4050 kcal/kg). The overall stripping ratio is projected at 1:3.82 m³/t.

## 3. HEMM Fleet Efficiency & Fuel Benchmarking
Per NCL statutory filing NCL/HEMM/2024/AUD-019 v1.0, 240-Tonne dumper availability across central projects averaged **84.2%**, outperforming the statutory benchmark of 80.0%. Specific diesel consumption across the Jayant sector was monitored at **0.61 Litres per tonne-km**.

## 4. Compliance Directive
All pit expansions extending beyond 200m depth must adhere to the mandatory 38° overall slope limit in sandstone formations and continuous SSR radar velocity alerting (2.5 mm/hr).`,
    tables: [
      {
        id: 'tbl_rep_01',
        headers: ['Project / Block', 'Metric', 'Approved Value', 'Statutory Benchmark', 'Variance / Compliance'],
        rows: [
          ['Korba West (SECL)', 'Proved Reserves (MT)', '51.4 MT', '42.8 MT (v1)', '+20.1% (+8.6 MT)'],
          ['Korba West (SECL)', 'Coal Quality Grade', 'Grade G7 (4050 kcal/kg)', 'Grade G8', 'Upgraded (+230 kcal/kg)'],
          ['Jayant OCP (NCL)', '240T Dumper Availability', '86.4%', '80.0%', '+6.4% above target'],
          ['Singrauli Fleet (NCL)', 'Specific Diesel Rate', '0.62 L/t-km', '0.68 L/t-km', '-8.8% (Fuel Efficient)']
        ]
      }
    ],
    citations: [
      {
        chunkId: 'chk_korba_reserves',
        documentId: 'doc_korba_geo_01',
        documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
        documentCode: 'CMPDI/GEO/2024/SECL-082',
        versionNumber: 2,
        pageOrSheetRef: 'Page 14, Section 3.2',
        excerpt: 'Comprehensive 30-borehole analysis for Korba West Seam IV/V confirms total proved geological reserve of 51.4 Million Tonnes (MT).',
        relevanceScore: 0.99,
        subsidiary: 'SECL'
      },
      {
        chunkId: 'chk_singrauli_dumper_audit',
        documentId: 'doc_singrauli_hemm_04',
        documentTitle: 'NCL Singrauli Heavy Earth Moving Machinery (HEMM) Fleet Productivity & Diesel Audit',
        documentCode: 'NCL/HEMM/2024/AUD-019',
        versionNumber: 1,
        pageOrSheetRef: 'Sheet HEMM_Project_Performance_Q1, Rows 2-6',
        excerpt: '240T Dumper fleet availability averaged 84.2% across NCL projects.',
        relevanceScore: 0.95,
        subsidiary: 'NCL'
      }
    ],
    status: 'verified_official',
    createdAt: '2026-08-20T16:45:00Z'
  }
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud_108',
    timestamp: '2026-08-25T08:30:14Z',
    actorId: 'usr_emp_01',
    actorName: 'Er. Rajesh Kumar Verma',
    actorRole: 'employee',
    actorSubsidiary: 'SECL',
    action: 'SUBMIT_VERSION',
    documentId: 'doc_korba_geo_01',
    documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
    versionNumber: 3,
    details: 'Submitted version 3 (Draft Amendment) proposing high-wall mining boundary alteration due to Hasdeo recharge zone.',
    ipAddress: '10.144.18.92'
  },
  {
    id: 'aud_107',
    timestamp: '2026-08-24T14:10:02Z',
    actorId: 'usr_emp_02',
    actorName: 'Pooja Sharma',
    actorRole: 'employee',
    actorSubsidiary: 'BCCL',
    action: 'AI_QUERY',
    details: 'Queried AI Assistant regarding DGMS Jharia nitrogen infusion flow rates and temperature alarm thresholds. Source cited: BCCL/SFT/2024/JCF-041 v3.',
    ipAddress: '10.128.4.11'
  },
  {
    id: 'aud_106',
    timestamp: '2026-08-20T16:45:00Z',
    actorId: 'usr_emp_01',
    actorName: 'Er. Rajesh Kumar Verma',
    actorRole: 'employee',
    actorSubsidiary: 'SECL',
    action: 'GENERATE_REPORT',
    documentTitle: 'REP/CIL/2024/Q1-094',
    details: 'Generated and compiled official Q1 Heavy Mining Operations & Geological Alignment brief across SECL and NCL data sources.',
    ipAddress: '10.144.18.92'
  },
  {
    id: 'aud_105',
    timestamp: '2024-07-22T14:15:00Z',
    actorId: 'usr_adm_01',
    actorName: 'Dr. Arindam Mukherjee',
    actorRole: 'admin',
    actorSubsidiary: 'CMPDI HQ',
    action: 'APPROVE_VERSION',
    documentId: 'doc_korba_geo_01',
    documentTitle: 'Korba West Coalfield Seam IV/V Deep Drilling Geological Assessment',
    versionNumber: 2,
    details: 'Approved v2.0 update (+8.6 MT proved reserve upward revision, G7 quality upgrade). Triggered automatic AI Knowledge Base re-index.',
    ipAddress: '10.110.1.25'
  },
  {
    id: 'aud_104',
    timestamp: '2024-05-10T12:00:00Z',
    actorId: 'usr_adm_01',
    actorName: 'Dr. Arindam Mukherjee',
    actorRole: 'admin',
    actorSubsidiary: 'CMPDI HQ',
    action: 'APPROVE_VERSION',
    documentId: 'doc_jharia_fire_02',
    documentTitle: 'Jharia Coalfield Fire Control & Surface Sealing Operational Protocol',
    versionNumber: 3,
    details: 'Approved v3.0 DGMS mandatory revision. Re-indexed 4 chunks into knowledge base.',
    ipAddress: '10.110.1.25'
  }
];

export const SEED_TOPIC_INSIGHTS: TopicInsight[] = [
  { topic: 'Geological Reserve Assessment', occurrences: 142, sentiment: 'favorable', confidence: 98, subsidiaries: ['SECL', 'CMPDI HQ', 'CCL'], relatedDocsCount: 14 },
  { topic: 'Slope Stability & Highwall Safety', occurrences: 118, sentiment: 'critical', confidence: 96, subsidiaries: ['SECL', 'NCL', 'WCL'], relatedDocsCount: 11 },
  { topic: 'Subsurface Fire Containment (N₂)', occurrences: 94, sentiment: 'critical', confidence: 99, subsidiaries: ['BCCL', 'ECL'], relatedDocsCount: 8 },
  { topic: 'HEMM Diesel & Fleet Telematics', occurrences: 88, sentiment: 'favorable', confidence: 94, subsidiaries: ['NCL', 'SECL', 'MCL'], relatedDocsCount: 9 },
  { topic: 'DGMS Ventilation & Methane Cutoff', occurrences: 76, sentiment: 'neutral', confidence: 97, subsidiaries: ['CMPDI HQ', 'BCCL', 'ECL'], relatedDocsCount: 7 },
  { topic: 'Washery Yield & Ash Beneficiation', occurrences: 65, sentiment: 'favorable', confidence: 92, subsidiaries: ['CCL', 'BCCL'], relatedDocsCount: 6 },
  { topic: 'Inundation Barriers & Hydrogeology', occurrences: 52, sentiment: 'critical', confidence: 95, subsidiaries: ['SECL', 'ECL'], relatedDocsCount: 5 },
  { topic: 'Environmental Clearance Setbacks', occurrences: 44, sentiment: 'neutral', confidence: 91, subsidiaries: ['CMPDI HQ', 'SECL'], relatedDocsCount: 4 }
];

export const SEED_TOPIC_TRENDS: TopicTrend[] = [
  { month: 'Apr 2025', boreholeData: 48, slopeStability: 24, groundwater: 18, dgmsCompliance: 32 },
  { month: 'May 2025', boreholeData: 54, slopeStability: 28, groundwater: 22, dgmsCompliance: 35 },
  { month: 'Jun 2025', boreholeData: 61, slopeStability: 38, groundwater: 36, dgmsCompliance: 42 },
  { month: 'Jul 2025', boreholeData: 45, slopeStability: 64, groundwater: 78, dgmsCompliance: 58 },
  { month: 'Aug 2025', boreholeData: 42, slopeStability: 82, groundwater: 94, dgmsCompliance: 72 },
  { month: 'Sep 2025', boreholeData: 52, slopeStability: 76, groundwater: 88, dgmsCompliance: 68, inundationAnomaly: true },
  { month: 'Oct 2025', boreholeData: 68, slopeStability: 48, groundwater: 44, dgmsCompliance: 52 },
  { month: 'Nov 2025', boreholeData: 74, slopeStability: 36, groundwater: 30, dgmsCompliance: 46 },
  { month: 'Dec 2025', boreholeData: 82, slopeStability: 32, groundwater: 26, dgmsCompliance: 40 },
  { month: 'Jan 2026', boreholeData: 89, slopeStability: 30, groundwater: 24, dgmsCompliance: 44 },
  { month: 'Feb 2026', boreholeData: 95, slopeStability: 34, groundwater: 28, dgmsCompliance: 48 }
];
