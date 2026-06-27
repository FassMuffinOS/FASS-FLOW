// ── FASS Government Contracting Masterclass — 10-Mission Curriculum ──
// Structured from the official workbook (FASS Technologies LLC, June 2026).
// Each mission unlocks after the previous one is marked complete.
//
// `unlocks` ties each mission to a real, already-live FASS Flow tool so
// finishing a mission hands the student something they can use immediately —
// not just a checkmark. `n`/`night`/"Night" stay as internal field/column
// names (masterclass_progress.night in Supabase) — only display copy says
// "Mission" now.

export const MASTERCLASS_NIGHTS = [
  {
    n: 1,
    week: 1,
    title: 'The Opportunity',
    subtitle: 'Why government is your biggest untapped customer',
    unlocks: { label: 'WARDOG', to: '/wardog' },
    objectives: [
      'Understand how much federal, state, and local government spends with small businesses every year',
      'Learn why most small businesses never access this market — and why that is your advantage',
      'Identify which level of government is easiest to start with based on your business type',
      'Leave with one specific agency to research before Night 2',
    ],
    sections: [
      {
        heading: 'The size of the market',
        body: 'The federal government is the largest buyer of goods and services in the world. Maryland state government and Baltimore City together spend billions annually on contracts — a significant portion reserved by law for small businesses. Most of that money goes to companies that simply showed up and knew the process.',
      },
      {
        heading: 'Why small businesses leave it on the table',
        body: 'No awareness that the opportunity exists. No registered presence in the procurement system. No professional-looking capability documentation. No disciplined process for finding and responding to solicitations. None of these are skill barriers — they are knowledge and process barriers. That is exactly what this course removes.',
      },
      {
        heading: 'Three levels: federal, state, local',
        body: 'SAM.gov is the federal marketplace. eMMA is Maryland’s state procurement portal. Baltimore City and county governments post separately. You do not need all three on Day 1. You need the one that matches your services and is closest to your current capacity.',
      },
      {
        heading: 'The small business set-aside advantage',
        body: 'By law, federal agencies must direct a percentage of contract spending to small businesses. Maryland runs a Small Business Reserve program that restricts certain contracts to small businesses only. As a small business, you are not competing against Lockheed Martin. You are competing against people who also do not know what they are doing yet — and FASS does.',
      },
    ],
    homework: 'Go to sam.gov/content/opportunities. Search your type of work — cleaning, staffing, food service, event support, logistics. Read three opportunity titles and their descriptions. Write down what you notice.',
    worksheet: [
      'NAICS code / service type you searched',
      'Opportunity #1 — title and agency',
      'Opportunity #2 — title and agency',
      'Opportunity #3 — title and agency',
      'Pattern you noticed (set-aside type, dollar range, deadline pattern)',
      'One agency to research before Night 2',
    ],
    takeaways: [
      'Government is the largest buyer in the country and is required by law to spend with small businesses',
      'The barrier is not skill — it is knowledge, registration, and process',
      'Maryland’s eMMA and Baltimore City are the fastest entry points for most local service businesses',
      'Your first target is one agency, one contract type, one NAICS code',
    ],
  },
  {
    n: 2,
    week: 1,
    title: 'Entity Setup',
    subtitle: 'SAM.gov, eMMA, and your federal identity',
    unlocks: { label: 'Business Profile', to: '/start' },
    objectives: [
      'Understand what a UEI is and why it is the foundation of everything',
      'Walk through the SAM.gov registration process step by step',
      'Register or begin registration on Maryland’s eMMA portal',
      'Know exactly what documents and information you need before you start',
    ],
    sections: [
      {
        heading: 'What is a UEI',
        body: 'The Unique Entity Identifier is a 12-character code assigned by SAM.gov that serves as your federal business ID. Without it, you cannot be awarded a federal contract, cannot receive federal grant funding, and cannot appear in any federal procurement search. Getting your UEI assigned is free and takes less than an hour. Completing the full registration takes 45–90 minutes and activates within 7–10 business days.',
      },
      {
        heading: 'What you need before you start SAM.gov',
        body: 'Your EIN from the IRS. Your legal business name exactly as registered with your state. Your physical business address. Your NAICS codes. A bank account and routing number for payment setup. Your SDAT number if you are a Maryland LLC. Have all of these in front of you before you click ‘Add New Entity.’',
      },
      {
        heading: 'Walking through eMMA registration',
        body: 'eMMA is Maryland’s eMaryland Marketplace Advantage portal at emma.maryland.gov. Registration is free. You create a vendor profile, select your service categories, set your service area, and receive automatic notifications when matching opportunities are posted. The Small Business Reserve self-certification is completed in the same portal — it takes 20 minutes and immediately places you in a smaller, less competitive bidding pool.',
      },
      {
        heading: 'NAICS codes — your opportunity filter',
        body: 'NAICS codes are six-digit industry classification codes that determine which opportunities you see and which set-asides you qualify for. Core FASS codes: 561320 Temporary Help Services, 561210 Facilities Support Services, 561720 Janitorial Services, 561499 All Other Business Support Services. Register all codes that accurately describe your work — not codes you cannot support.',
      },
    ],
    homework: 'Complete or begin your SAM.gov registration. If already registered, log in and verify your NAICS codes are correct. Screenshot your entity status page and bring it to Night 3.',
    worksheet: [
      'UEI (once assigned)',
      'EIN on file? Y/N',
      'NAICS codes selected (list all)',
      'SAM.gov registration status (in progress / active / pending)',
      'eMMA vendor profile created? Y/N',
      'Documents still missing',
    ],
    takeaways: [
      'UEI is your federal identity — free to get, required for everything',
      'SAM.gov registration takes 45–90 minutes and activates in 7–10 days',
      'eMMA is Maryland’s portal — register here for state and local opportunities',
      'NAICS codes are your opportunity filter — choose every code that matches your real work',
    ],
  },
  {
    n: 3,
    week: 1,
    title: 'NAICS Codes & Certifications',
    subtitle: 'Unlocking set-asides and preferences',
    unlocks: { label: 'WARDOG filters', to: '/wardog' },
    objectives: [
      'Select the right NAICS codes for your specific business',
      'Understand the difference between federal and state small business programs',
      'Learn what MBE certification is and why it is a force multiplier in Maryland',
      'Know which certifications to pursue first based on your timeline',
    ],
    sections: [
      {
        heading: 'Small Business Reserve — Maryland’s fastest win',
        body: 'Maryland’s Small Business Reserve program restricts certain state procurements to small businesses only. Self-certification is free, takes 20 minutes inside eMMA, and immediately places you in a smaller bidding pool where your only competition is other small businesses. This is the first certification every Maryland small business should complete.',
      },
      {
        heading: 'MBE certification — the subcontracting door',
        body: 'Maryland’s Minority Business Enterprise certification through MDOT opens subcontracting opportunities on virtually every major state contract. Prime contractors who win large Maryland contracts are required to meet MBE participation goals. Even before you win a prime contract, MBE certification gets you paid as a subcontractor on contracts you did not have to bid on directly.',
      },
      {
        heading: 'Federal small business certifications',
        body: 'SBA offers several certification programs: 8(a) Business Development, HUBZone, WOSB (women-owned), and SDVOSB (service-disabled veteran-owned). Each unlocks specific set-asides at the federal level. Research which apply to your ownership profile.',
      },
      {
        heading: 'Certification strategy — sequence matters',
        body: 'Do not try to get every certification at once. The sequence: SAM.gov registration first, eMMA Small Business Reserve self-certification second, MBE application third if you qualify, federal SBA certifications fourth based on ownership profile.',
      },
    ],
    homework: 'Research your MBE eligibility at mdot.maryland.gov/MBE. Download the application checklist. List the three documents you do not have yet and need to gather.',
    worksheet: [
      'MBE eligibility (Y/N/unsure)',
      'Maryland Small Business Reserve self-certification completed? Y/N',
      'Three documents needed for MBE application',
      'Target certification order (1st, 2nd, 3rd)',
    ],
    takeaways: [
      'Maryland Small Business Reserve self-certification is free and takes 20 minutes — do it today',
      'MBE certification opens subcontracting income before you ever win a prime contract',
      'Sequence your certifications: SAM → eMMA SBR → MBE → SBA programs',
      'Certifications are not just credentials — they are legal set-asides that reduce your competition',
    ],
  },
  {
    n: 4,
    week: 1,
    title: 'Your Capabilities Statement',
    subtitle: 'The document that gets you in the room',
    unlocks: { label: 'FASS FILL', to: '/fill' },
    objectives: [
      'Understand what a capabilities statement is and when to use it',
      'Know every section a professional capabilities statement must include',
      'Begin building your own capabilities statement during class',
      'Leave with a complete draft ready for review',
    ],
    sections: [
      {
        heading: 'What a capabilities statement is',
        body: 'A one-to-two page professional document that summarizes your business for a contracting officer, prime contractor, or agency small business liaison. It answers three questions: Who are you, what can you do, and why should we trust you to do it.',
      },
      {
        heading: 'The six required sections',
        body: 'Company profile (name, UEI, CAGE, address, contact), NAICS codes and set-aside status, core competencies and service lines, differentiators, past performance or relevant experience, and contact information. Missing any one weakens the document significantly.',
      },
      {
        heading: 'Past performance when you are new',
        body: 'New businesses struggle here because they think past performance means government contracts. It does not. It means documented, verifiable experience doing the type of work the contract requires. The key is specificity — not ‘we do events’ but ‘planned and executed 12-person crew deployment for a Baltimore catering operation including scheduling, check-in tracking, and same-day completion documentation.’',
      },
      {
        heading: 'Live workshop — build yours tonight',
        body: 'Using the FASS playbook as a template, populate each section of your own capabilities statement. Use the FASS Flow Capability Statement Generator (in your Dashboard → FASS FILL) to draft it digitally.',
      },
    ],
    homework: 'Complete your capabilities statement draft. It should be one to two pages, include all six sections, and have zero placeholder text remaining. Bring it to Night 5 for peer review.',
    worksheet: [
      'Company profile section complete? Y/N',
      'NAICS codes + set-aside status listed? Y/N',
      'Core competencies (3–5 lines)',
      'Differentiators — what makes you different',
      'Past performance entries drafted (list 1–3)',
      'Contact info verified? Y/N',
    ],
    takeaways: [
      'A capabilities statement is the single most important document a government contractor can have',
      'Six required sections: company profile, NAICS codes, core competencies, differentiators, past performance, contact',
      'New businesses frame pilot operations and commercial experience as relevant experience',
      'Specificity beats generality — exact numbers, roles, and outcomes outperform vague claims',
    ],
  },
  {
    n: 5,
    week: 1,
    title: 'Capabilities Statement Workshop',
    subtitle: 'Review, refine, and make it submission-ready',
    unlocks: { label: 'Passport', to: '/passport' },
    objectives: [
      'Receive structured feedback on your capabilities statement draft',
      'Apply the contracting officer’s lens — what they look for and what turns them off',
      'Finalize your capabilities statement to professional standard',
      'Understand where and how to distribute it',
    ],
    sections: [
      {
        heading: 'The contracting officer’s first read',
        body: 'Contracting officers spend 60–90 seconds on the first pass. They are looking for: Does this business do what I need? Are they registered in SAM.gov? Are they the right size and set-aside category? Is this document professional enough to trust?',
      },
      {
        heading: 'Common mistakes that kill credibility',
        body: 'Vague language with no specifics. Claiming certifications not yet received. Using ‘we’ without ever defining the team. Listing NAICS codes that do not match the actual work. Messy formatting. Incorrect or missing UEI. Not verifying SAM.gov status before attaching it.',
      },
      {
        heading: 'Peer review structure',
        body: 'Can you tell exactly what this company does in one sentence? Are all six sections present and complete? Is the past performance specific and verifiable? Would you feel confident attaching this to an agency inquiry?',
      },
      {
        heading: 'Where to send it',
        body: 'Agency small business offices, prime contractor teaming contacts (search SAM.gov for primes in your NAICS codes), your eMMA profile attachment, and Maryland PTAC / SBA Maryland matchmaking events.',
      },
    ],
    homework: 'Send your finalized capabilities statement to one agency small business office or prime contractor subcontracting contact before Night 6. Document who you sent it to and when.',
    worksheet: [
      'Recipient name and agency/company',
      'Contact role (small business liaison / prime / PTAC)',
      'Date sent',
      'Method (email / portal / in person)',
      'Follow-up date planned',
    ],
    takeaways: [
      'Contracting officers spend 60–90 seconds on first read — your document must answer four questions immediately',
      'Vague language, unverified certifications, and missing sections are the most common disqualifiers',
      'Peer review reveals blind spots your own eyes miss',
      'Distribution targets: agency small business offices, prime contractor subs teams, eMMA profile, matchmaking events',
    ],
  },
  {
    n: 6,
    week: 2,
    title: 'Reading a Solicitation',
    subtitle: 'Extracting everything that matters in two hours',
    unlocks: { label: 'R-E-A-D', to: '/read' },
    objectives: [
      'Understand the structure of a federal and state solicitation',
      'Know exactly what to extract from any solicitation within two hours of finding it',
      'Identify mandatory requirements versus evaluation preferences',
      'Complete the Opportunity Response Worksheet for a real solicitation',
    ],
    sections: [
      {
        heading: 'Solicitation anatomy',
        body: 'Cover page: solicitation number, agency, due date, set-aside. Section B / price schedule: what you are pricing. Section C / SOW: exactly what performance is required. Section L: how to prepare your response. Section M: how you will be evaluated. Read in this order: cover page, set-aside, due date, SOW, evaluation factors, price schedule, instructions.',
      },
      {
        heading: 'Mandatory versus desirable',
        body: 'Mandatory items use ‘shall,’ ‘must,’ ‘required,’ ‘will.’ Desirable items use ‘should,’ ‘may,’ ‘preferred,’ ‘desirable.’ Highlight every ‘shall’ and ‘must’ before you write a single word. If you cannot meet every mandatory requirement, do not bid.',
      },
      {
        heading: 'The two-hour intake process',
        body: 'Hour one: read the entire solicitation front to back without writing anything. Hour two: open the Opportunity Response Worksheet (or FASS FILL) and populate every field. When the worksheet is complete, you have a complete intake.',
      },
      {
        heading: 'Amendments and addenda',
        body: 'Every amendment must be acknowledged in your response, usually via an amendment acknowledgement form. Bidders who miss one are often disqualified on a technicality. Subscribe to the opportunity in SAM.gov or eMMA for automatic notifications.',
      },
    ],
    homework: 'Find one real open solicitation on SAM.gov or eMMA in your NAICS code. Complete the full Opportunity Response Worksheet for it — or run it through FASS FILL. Bring it to Night 7.',
    worksheet: [
      'Solicitation number',
      'Agency',
      'Due date',
      'Set-aside type',
      'Every "shall" / "must" requirement found (list each)',
      'Amendments acknowledged? Y / N / none posted',
    ],
    takeaways: [
      'Read solicitations in order: cover page → set-aside → due date → SOW → evaluation factors → price schedule → instructions',
      'Highlight every ‘shall’ and ‘must’ — these are your mandatory requirements and disqualifiers',
      'The two-hour intake process produces a completed Opportunity Response Worksheet',
      'Always check for amendments and acknowledge every one in your response',
    ],
  },
  {
    n: 7,
    week: 2,
    title: 'Bid / No-Bid',
    subtitle: 'The decision that saves you from losing before you start',
    unlocks: { label: 'Pipeline', to: '/pipeline' },
    objectives: [
      'Apply the six bid/no-bid questions to a real solicitation',
      'Identify the no-go triggers that disqualify a bid before submission',
      'Calculate whether a contract is worth pursuing based on margin and risk',
      'Make a confident same-day bid/no-bid decision',
    ],
    sections: [
      {
        heading: 'The six questions',
        body: '1) Can FASS legally bid today? 2) Can FASS meet every mandatory requirement? 3) Can FASS source and verify labor, providers, vendors, and equipment before committing to price? 4) Is there enough time to produce a compliant package? 5) Does the margin justify the cash-flow exposure and risk? 6) Can FASS substantiate every claim, reference, and certification?',
      },
      {
        heading: 'The no-go triggers',
        body: 'Do not submit if you cannot meet a mandatory requirement, cannot validate price and staffing, lack a required credential, cannot accept contractual terms, or cannot complete the submission package by the deadline. One no-go trigger is enough to kill the bid.',
      },
      {
        heading: 'Scoring margin and risk',
        body: 'Estimate direct labor/provider cost, payroll burden and insurance, project management, equipment/supplies, contingency, and fee. If contract value minus all costs does not produce a justifiable margin, it is a no-bid regardless of how attractive the opportunity looks.',
      },
    ],
    homework: 'Apply all six bid/no-bid questions to the solicitation you found for Night 6 — or use FASS Flow’s R-E-A-D tool. Write your decision (bid, no-bid, or hold) with the specific reason for each question. Bring to Night 8.',
    worksheet: [
      'Can FASS legally bid today? Y / N',
      'Can FASS meet every mandatory requirement? Y / N',
      'Can FASS source and verify labor/providers/vendors before pricing? Y / N',
      'Enough time for a compliant package? Y / N',
      'Does margin justify the cash-flow exposure and risk? Y / N',
      'Can FASS substantiate every claim, reference, and certification? Y / N',
      'Final decision: BID / NO-BID / HOLD — and why',
    ],
    takeaways: [
      'The bid/no-bid decision protects your time, money, and reputation',
      'Six questions — all six must clear before you commit',
      'One no-go trigger is enough to stop the bid',
      'Margin, cash-flow, and management time are financial decisions, not just compliance decisions',
    ],
  },
  {
    n: 8,
    week: 2,
    title: 'Pricing Your Bid',
    subtitle: 'Building a number that wins without losing money',
    unlocks: { label: 'Estimator', to: '/estimator' },
    objectives: [
      'Build a price from the bottom up using verified labor, provider, and supply costs',
      'Understand what payroll burden, fringe, and insurance add to direct labor cost',
      'Apply the FASS internal pricing bands correctly',
      'Produce a compliant price schedule for a real solicitation',
    ],
    sections: [
      {
        heading: 'Price from the scope, not the market',
        body: 'Read the SOW, identify every deliverable and labor category, source your actual costs, add burden and overhead, add margin, then compare to the market. If your cost-built price is not competitive, find savings or do not bid — never reduce below cost.',
      },
      {
        heading: 'The pricing components',
        body: 'Direct labor/provider cost. Payroll burden (taxes, workers comp, liability insurance, fringe). Project management and oversight as a separate line item. Equipment/supplies at actual cost. Vendor/subcontractor cost with real quotes. Mobilization (mileage, parking, training, background checks).',
      },
      {
        heading: 'Using the FASS internal price bands',
        body: 'Program/contract manager: $55–$85/hr. Site lead/crew captain: $40–$65. Specialized ops/logistics: $35–$55. Food service/event/guest support: $30–$50. General labor/setup/stocking: $28–$45. Janitorial/cleanup: $28–$42. These are planning tools only — final pricing must reflect verified quotes and wage determinations.',
      },
      {
        heading: 'Wage determinations and labor clauses',
        body: 'Some contracts require paying the prevailing wage under the Service Contract Act or state wage laws. If a wage determination is attached, it is not optional. Price below it and you are non-compliant.',
      },
    ],
    homework: 'Build a complete bottom-up price for the solicitation you have been tracking. Show every line item. Bring the price build to Night 9.',
    worksheet: [
      'Direct labor / provider cost',
      'Payroll burden (taxes, workers comp, liability insurance, fringe)',
      'Project management / oversight line item',
      'Equipment / supplies cost',
      'Vendor / subcontractor quotes',
      'Mobilization cost (mileage, parking, training, background checks)',
      'Margin / fee',
      'Total price',
    ],
    takeaways: [
      'Price from the scope up — never from a target number down',
      'Every component must appear as a line item: labor, burden, overhead, management, supplies, mobilization',
      'Internal price bands are planning tools — final pricing requires verified quotes and wage determinations',
      'If the cost-built price is not competitive, find savings or do not bid — never price below cost',
    ],
  },
  {
    n: 9,
    week: 2,
    title: 'Writing the Response',
    subtitle: 'Telling your story in the agency’s language',
    unlocks: { label: 'Client Proposals', to: '/proposals' },
    objectives: [
      'Structure a technical narrative that mirrors the solicitation’s evaluation criteria',
      'Write past performance entries that are specific, verifiable, and relevant',
      'Assemble a complete proposal package using the Proposal Assembly Checklist',
      'Avoid the formatting and compliance mistakes that disqualify bids before evaluation',
    ],
    sections: [
      {
        heading: 'Mirror the solicitation’s structure',
        body: 'If Section L organizes the technical volume as (1) understanding of scope, (2) technical approach, (3) staffing plan, (4) quality plan — your response has exactly those four sections in exactly that order.',
      },
      {
        heading: 'The technical narrative sequence',
        body: 'Scope understanding, technical/work plan, staffing and supervision, mobilization and schedule, quality assurance and reporting, past performance, pricing, forms and certifications. Be specific under each section.',
      },
      {
        heading: 'Writing past performance entries',
        body: 'Client/agency name and contact, contract/project value, period of performance, scope description, specific outcomes and metrics, client feedback. Vague entries score zero. Specific entries score points.',
      },
      {
        heading: 'The Proposal Assembly Checklist',
        body: 'Cover letter with correct solicitation number and signature. Technical narrative mirroring evaluation criteria. Correct pricing form. All required forms signed. Company data including UEI and active SAM status. Correct file types, names, size limits, submission portal. Receipt saved.',
      },
    ],
    homework: 'Draft the technical narrative for your solicitation using FASS Flow’s proposal outline scaffold. It should mirror the solicitation’s evaluation headings. Bring a complete draft to Night 10.',
    worksheet: [
      'Section L structure mirrored in your response? Y / N',
      'Scope understanding — one paragraph summary',
      'Technical / work plan — one paragraph summary',
      'Staffing and supervision — one paragraph summary',
      'Past performance entries finalized (client, value, period, scope, outcome, contact)',
      'Proposal Assembly Checklist run? Y / N',
    ],
    takeaways: [
      'Mirror the solicitation’s headings exactly — evaluators score in order',
      'Every claim must be specific, quantified, and verifiable — vague language scores zero',
      'Past performance entries follow a consistent format: client, value, period, scope, outcome, contact',
      'The Proposal Assembly Checklist is your final gate — run it before every submission',
    ],
  },
  {
    n: 10,
    week: 2,
    title: 'After the Award',
    subtitle: 'Performing, documenting, and compounding',
    unlocks: { label: 'FASS Wallet', to: '/wallet' },
    objectives: [
      'Understand what happens after an award is issued and what your obligations are',
      'Build the documentation and performance record that makes the next bid stronger',
      'Learn how subcontracting as an MBE builds past performance without winning a prime',
      'Map your 90-day post-award execution plan',
    ],
    sections: [
      {
        heading: 'The award is the beginning, not the end',
        body: 'A contract award is a legal obligation. Performance failures are documented in CPARS (federal) and equivalent state systems. A poor performance record follows your company; a strong record compounds and becomes your most powerful differentiator.',
      },
      {
        heading: 'The FASS closeout process',
        body: 'Mobilize with confirmed roster and scope. Deploy with a crew lead check-in. Manage with daily status and quality checks. Close out with completion confirmation, time records, and photos where permitted. This is your evidence file for any dispute and the source of your next past performance entry.',
      },
      {
        heading: 'Building past performance while waiting for a prime',
        body: 'Subcontracting as a certified MBE under a prime gives you a contract number, client contact, period of performance, and measurable outcome — everything a past performance entry requires.',
      },
      {
        heading: 'The compound effect',
        body: 'One contract executed well produces a past performance entry, client reference, performance metrics, and credibility to bid larger contracts. Two or three produce a pipeline. Ten produce a track record.',
      },
    ],
    homework: 'Write your 90-day post-award plan. What is the first contract you realistically target — state, local, or sub? What steps do you take in the next 30 days to be ready to execute the moment an award comes?',
    worksheet: [
      'First contract realistically targeted (state / local / sub)',
      'Steps in the next 30 days to be execution-ready',
      'MBE subcontracting opportunities being pursued',
      'Who owns documentation and closeout for this contract',
    ],
    takeaways: [
      'Government contracts are legal obligations — performance failures are documented and follow your company',
      'Every job deserves the full FASS closeout process: mobilize, deploy, manage, close out with evidence',
      'MBE subcontracting builds past performance without winning a prime — pursue it immediately',
      'The compound effect of executed contracts is the only sustainable path to large contract wins',
    ],
  },
]
