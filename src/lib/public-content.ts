export type TextFieldType = "input" | "textarea";
export type PublicPageKey = "main" | "about" | "projects" | "workshops" | "events" | "team" | "join";

export const PUBLIC_PAGE_KEYS: PublicPageKey[] = [
  "main",
  "about",
  "projects",
  "workshops",
  "events",
  "team",
  "join",
];

export interface PublicTextFieldConfig {
  key: string;
  label: string;
  type?: TextFieldType;
}

export interface PublicTextGroupConfig {
  id: string;
  page: PublicPageKey;
  title: string;
  description: string;
  fields: PublicTextFieldConfig[];
}

export interface HomeHighlightItem {
  icon: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface AboutValueItem {
  icon: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface AboutTimelineItem {
  year: string;
  eventEn: string;
  eventAr: string;
  detailEn: string;
  detailAr: string;
}

export interface JoinBenefitItem {
  icon: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface JoinStepItem {
  number: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface JoinFaqItem {
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
}

export interface EventAchievementItem {
  icon: string;
  nameEn: string;
  nameAr: string;
  resultEn: string;
  resultAr: string;
  locationEn: string;
  locationAr: string;
}

export interface TeamStatItem {
  value: string;
  labelEn: string;
  labelAr: string;
}

export interface HomeAnnouncementCardItem {
  badgeEn: string;
  badgeAr: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  imageUrl: string;
  href: string;
  ctaEn: string;
  ctaAr: string;
  pinned: string;
}

export interface HomeHeroBannerItem {
  eyebrowEn: string;
  eyebrowAr: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
  href: string;
  ctaEn: string;
  ctaAr: string;
  metric: string;
}

export interface HomeFeatureSpotlightItem {
  labelEn: string;
  labelAr: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
  href: string;
  ctaEn: string;
  ctaAr: string;
}

export type CustomSegmentTemplate =
  | "split-feature"   // image + text side by side (current default)
  | "hero-banner"     // full-bleed image background, centered overlay text/CTA
  | "stacked"         // image on top, text below (vertical card)
  | "quote-card"      // large centered pull-quote with attribution
  | "gallery"         // 2-up centered gallery with shared caption
  | "cta-banner";     // compact full-width gradient CTA band

export interface CustomPageSegmentItem {
  badgeEn: string;
  badgeAr: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  imageUrl: string;
  secondaryImageUrl: string;
  href: string;
  ctaEn: string;
  ctaAr: string;
  mediaMode: "none" | "single" | "double";
  align: "left" | "right";
  tone: "accent" | "neutral" | "warm" | "cool";
  /** Optional layout template; defaults to split-feature for back-compat. */
  template?: CustomSegmentTemplate;
}

export const HOME_HIGHLIGHT_ICON_OPTIONS = [
  { value: "lightbulb", label: "Lightbulb" },
  { value: "code2", label: "Code" },
  { value: "users-round", label: "Community" },
  { value: "cpu", label: "CPU" },
  { value: "zap", label: "Zap" },
] as const;

export const ABOUT_VALUE_ICON_OPTIONS = [
  { value: "lightbulb", label: "Innovation" },
  { value: "users", label: "Community" },
  { value: "target", label: "Target" },
  { value: "shield", label: "Shield" },
] as const;

export const JOIN_BENEFIT_ICON_OPTIONS = [
  { value: "wrench", label: "Wrench" },
  { value: "trophy", label: "Trophy" },
  { value: "users", label: "Users" },
  { value: "book-open", label: "Book" },
  { value: "rocket", label: "Rocket" },
  { value: "zap", label: "Zap" },
] as const;

export const EVENT_ACHIEVEMENT_ICON_OPTIONS = [
  { value: "trophy", label: "Trophy" },
  { value: "users", label: "Users" },
  { value: "award", label: "Award" },
] as const;

export const DEFAULT_HOME_HIGHLIGHTS: HomeHighlightItem[] = [
  {
    icon: "lightbulb",
    titleEn: "Innovation",
    titleAr: "الابتكار",
    descriptionEn: "Drones, robotics, and R&D where members prototype ideas and take them into real competitions.",
    descriptionAr: "الدرونز والروبوتات والبحث والتطوير حيث يحول الأعضاء الأفكار إلى نماذج ومشاركات حقيقية.",
  },
  {
    icon: "code2",
    titleEn: "Development",
    titleAr: "التطوير",
    descriptionEn: "Software, apps, and AI systems that support autonomous projects and club operations.",
    descriptionAr: "البرمجيات والتطبيقات وأنظمة الذكاء الاصطناعي التي تدعم المشاريع وأنشطة النادي.",
  },
  {
    icon: "users-round",
    titleEn: "Community",
    titleAr: "المجتمع",
    descriptionEn: "Media, PR, HR, logistics, and member support that keep the whole ecosystem moving.",
    descriptionAr: "الإعلام والعلاقات العامة والموارد البشرية واللوجستيات والدعم الذي يجعل المنظومة كلها تعمل.",
  },
];

export const DEFAULT_ABOUT_VALUES: AboutValueItem[] = [
  {
    icon: "lightbulb",
    titleEn: "Innovation First",
    titleAr: "الابتكار أولًا",
    descriptionEn: "Every project, event, and idea is a chance to push past the expected and build something better.",
    descriptionAr: "كل مشروع وفعالية وفكرة هي فرصة لتجاوز المتوقع وبناء شيء أفضل.",
  },
  {
    icon: "users",
    titleEn: "Community Driven",
    titleAr: "بروح المجتمع",
    descriptionEn: "Our culture of mentorship and collaboration turns beginners into builders and builders into leaders.",
    descriptionAr: "ثقافة الإرشاد والتعاون لدينا تحول المبتدئين إلى صانعين والصانعين إلى قادة.",
  },
  {
    icon: "target",
    titleEn: "Competition Ready",
    titleAr: "جاهزون للمنافسة",
    descriptionEn: "We train to win, from campus hackathons to national and international robotics championships.",
    descriptionAr: "نتدرّب لنفوز من هاكاثونات الجامعة إلى البطولات الوطنية والدولية.",
  },
];

export const DEFAULT_ABOUT_TIMELINE: AboutTimelineItem[] = [
  {
    year: "2022",
    eventEn: "The club is founded",
    eventAr: "تأسيس النادي",
    detailEn: "A small group of King Saud University students set out to build a home for drones, robotics, and autonomous systems on campus — somewhere ambitious ideas could become real, working hardware.",
    detailAr: "بدأت مجموعة صغيرة من طلاب جامعة الملك سعود ببناء بيت للدرونز والروبوتات والأنظمة المستقلة في الحرم الجامعي — مكان تتحول فيه الأفكار الجريئة إلى أنظمة حقيقية وعاملة.",
  },
  {
    year: "2023",
    eventEn: "First members, first workshops",
    eventAr: "أول الأعضاء وأول الورش",
    detailEn: "The first membership cycles brought builders, designers, and organizers together. We ran the first workshop series and started shaping the committees that still run the club today.",
    detailAr: "جاءت دورات العضوية الأولى بالبنّائين والمصممين والمنظمين. أقمنا أول سلسلة ورش، وبدأنا بتشكيل اللجان التي ما زالت تدير النادي حتى اليوم.",
  },
  {
    year: "2024",
    eventEn: "Growing into a full ecosystem",
    eventAr: "التوسع إلى منظومة كاملة",
    detailEn: "The club expanded across nine specialized committees — engineering, software, media, public relations, HR, finance, logistics, and creative — each owning a real piece of how the club operates.",
    detailAr: "توسّع النادي عبر تسع لجان متخصصة — الهندسة والبرمجيات والإعلام والعلاقات العامة والموارد البشرية والمالية واللوجستيات والإبداع — وكل لجنة تتولى جزءًا حقيقيًا من تشغيل النادي.",
  },
  {
    year: "2025",
    eventEn: "A new chapter as DRC",
    eventAr: "فصل جديد باسم DRC",
    detailEn: "We rebranded as the Drones & Robotics Club, launched a weekly knowledge series, recognized the first Members of the Month, and started visiting industry partners to see how engineering plays out in the real world.",
    detailAr: "أعدنا تسمية النادي إلى نادي الدرونز والروبوت، وأطلقنا سلسلة معرفية أسبوعية، وكرّمنا أول أعضاء الشهر، وبدأنا بزيارة شركاء الصناعة لنرى كيف تتحول الهندسة إلى منتج حقيقي.",
  },
  {
    year: "2026",
    eventEn: "A sharper structure for what's next",
    eventAr: "هيكلة أوضح لما هو قادم",
    detailEn: "Restructured leadership, sharper committee scopes, and deeper member ownership — preparing the club for bigger projects, stronger partnerships, and a clearer alignment with Vision 2030.",
    detailAr: "هيكلة قيادية محدّثة، ونطاق أوضح للجان، وملكية أعمق للأعضاء — لتجهيز النادي لمشاريع أكبر وشراكات أقوى وتوافق أوضح مع رؤية 2030.",
  },
];

export const DEFAULT_JOIN_BENEFITS: JoinBenefitItem[] = [
  {
    icon: "wrench",
    titleEn: "Hands-On Experience",
    titleAr: "خبرة عملية",
    descriptionEn: "Build real projects in drones, robotics, software, events, and community initiatives.",
    descriptionAr: "ابنِ مشاريع حقيقية في الدرونز والروبوتات والبرمجيات والفعاليات والمبادرات المجتمعية.",
  },
  {
    icon: "trophy",
    titleEn: "Compete and Excel",
    titleAr: "نافس وتفوّق",
    descriptionEn: "Represent your university in national and regional robotics and innovation competitions.",
    descriptionAr: "مثّل جامعتك في المنافسات الوطنية والإقليمية في الهندسة والابتكار.",
  },
  {
    icon: "users",
    titleEn: "Community and Mentorship",
    titleAr: "مجتمع وإرشاد",
    descriptionEn: "Learn from experienced members and collaborate with motivated peers.",
    descriptionAr: "تعلّم من الأعضاء ذوي الخبرة وتعاون مع زملاء طموحين.",
  },
  {
    icon: "book-open",
    titleEn: "Workshops and Training",
    titleAr: "ورش وتدريب",
    descriptionEn: "Regular sessions on electronics, programming, media, design, and operations.",
    descriptionAr: "جلسات منتظمة في الإلكترونيات والبرمجة والإعلام والتصميم والتشغيل.",
  },
  {
    icon: "rocket",
    titleEn: "Career Opportunities",
    titleAr: "فرص مهنية",
    descriptionEn: "Build a portfolio, expand your network, and connect with sponsors and partners.",
    descriptionAr: "ابنِ ملفًا مهنيًا ووسّع شبكتك وتواصل مع الرعاة والشركاء.",
  },
  {
    icon: "zap",
    titleEn: "Access to Resources",
    titleAr: "وصول للموارد",
    descriptionEn: "Use labs, tools, 3D printers, flight simulators, and testing spaces.",
    descriptionAr: "استخدم المختبرات والأدوات والطابعات ثلاثية الأبعاد ومحاكيات الطيران ومساحات الاختبار.",
  },
];

export const DEFAULT_JOIN_STEPS: JoinStepItem[] = [
  {
    number: "01",
    titleEn: "Fill Out the Application",
    titleAr: "أكمل الطلب",
    descriptionEn: "Complete the form with your background, interests, and preferred department.",
    descriptionAr: "أدخل معلوماتك واهتماماتك واللجنة التي تفضّلها.",
  },
  {
    number: "02",
    titleEn: "Attend an Orientation",
    titleAr: "احضر التوجيه",
    descriptionEn: "Join an orientation session to meet the team and see the workspace.",
    descriptionAr: "احضر جلسة تعريفية لتتعرف على الفريق ومساحة العمل.",
  },
  {
    number: "03",
    titleEn: "Join a Department",
    titleAr: "انضم إلى لجنة",
    descriptionEn: "Get matched with a department based on your interests and strengths.",
    descriptionAr: "سيتم توجيهك إلى لجنة مناسبة بناءً على اهتماماتك ونقاط قوتك.",
  },
  {
    number: "04",
    titleEn: "Start Contributing",
    titleAr: "ابدأ المساهمة",
    descriptionEn: "Join projects, attend workshops, and start building with the club.",
    descriptionAr: "شارك في المشاريع واحضر الورش وابدأ البناء مع النادي.",
  },
];

export const DEFAULT_JOIN_FAQS: JoinFaqItem[] = [
  {
    questionEn: "Do I need prior experience?",
    questionAr: "هل أحتاج إلى خبرة مسبقة؟",
    answerEn: "No. We welcome complete beginners and provide training, workshops, and mentorship.",
    answerAr: "لا. نرحّب بالمبتدئين ونوفر التدريب وورش العمل والإرشاد.",
  },
  {
    questionEn: "What is the time commitment?",
    questionAr: "ما مقدار الوقت المطلوب؟",
    answerEn: "Most members spend 4 to 6 hours per week on club activities, with extra time near major events.",
    answerAr: "يقضي معظم الأعضاء من 4 إلى 6 ساعات أسبوعيًا مع وقت إضافي قرب الفعاليات الكبرى.",
  },
  {
    questionEn: "Which departments can I join?",
    questionAr: "ما اللجان التي يمكنني الانضمام إليها؟",
    answerEn: "You can apply to the member-facing departments and note your preferred track in the form.",
    answerAr: "يمكنك التقديم إلى اللجان المتاحة للأعضاء وذكر مسارك المفضل في النموذج.",
  },
  {
    questionEn: "Is there a membership fee?",
    questionAr: "هل توجد رسوم عضوية؟",
    answerEn: "Membership is free. Some advanced workshops or travel may have separate costs.",
    answerAr: "العضوية مجانية. قد تكون لبعض الورش المتقدمة أو السفر تكاليف منفصلة.",
  },
  {
    questionEn: "Can I work with more than one department?",
    questionAr: "هل يمكنني العمل مع أكثر من لجنة؟",
    answerEn: "Yes. You will usually have one primary department, but cross-team work is encouraged.",
    answerAr: "نعم. غالبًا سيكون لك مسار رئيسي واحد، لكن العمل بين اللجان مرحّب به.",
  },
];

// Empty by default — leadership fills these in via the Content dashboard
// once real achievements / stats are confirmed. Avoids shipping invented
// competition wins on day one.
export const DEFAULT_EVENT_ACHIEVEMENTS: EventAchievementItem[] = [];

export const DEFAULT_TEAM_STATS: TeamStatItem[] = [];

// Empty by default — leadership populates these via the Content dashboard
// when there's actual content to showcase. Public site renders clean
// empty states until then.
export const DEFAULT_HOME_ANNOUNCEMENT_CARDS: HomeAnnouncementCardItem[] = [];

export const DEFAULT_HOME_HERO_BANNERS: HomeHeroBannerItem[] = [];

export const DEFAULT_HOME_FEATURE_SPOTLIGHTS: HomeFeatureSpotlightItem[] = [];

export const DEFAULT_CUSTOM_PAGE_SEGMENTS: CustomPageSegmentItem[] = [];

export const PUBLIC_TEXT_GROUPS: PublicTextGroupConfig[] = [
  {
    id: "navigation",
    page: "main",
    title: "Navigation",
    description: "Main menu and top-level navigation labels.",
    fields: [
      { key: "nav.about", label: "About" },
      { key: "nav.projects", label: "Projects" },
      { key: "nav.workshops", label: "Workshops" },
      { key: "nav.events", label: "Events" },
      { key: "nav.team", label: "Team" },
      { key: "nav.joinus", label: "Join Us" },
      { key: "nav.signin", label: "Sign In" },
      { key: "nav.dashboard", label: "Dashboard" },
    ],
  },
  {
    id: "home-hero",
    page: "main",
    title: "Home Hero",
    description: "Homepage hero text, status pill, and CTA copy.",
    fields: [
      { key: "home.hero.kicker", label: "Hero Kicker" },
      { key: "home.status", label: "Status Pill" },
      { key: "home.hero1", label: "Hero Line 1" },
      { key: "home.hero2", label: "Hero Line 2" },
      { key: "home.sub", label: "Hero Description", type: "textarea" },
      { key: "home.tagline", label: "Hero Arabic Tagline", type: "textarea" },
      { key: "home.cta1", label: "Primary CTA" },
      { key: "home.cta2", label: "Secondary CTA" },
      { key: "scroll", label: "Scroll Hint" },
    ],
  },
  {
    id: "home-sections",
    page: "main",
    title: "Home Sections",
    description: "Homepage section headers and CTA copy.",
    fields: [
      { key: "home.announcements.label", label: "Announcements Label" },
      { key: "section.whatwedo.label", label: "Highlights Label" },
      { key: "section.whatwedo.title", label: "Highlights Title" },
      { key: "section.whatwedo.desc", label: "Highlights Description", type: "textarea" },
      { key: "home.motm.label", label: "Members of Month Label" },
      { key: "home.motm.title", label: "Members of Month Title" },
      { key: "home.motm.desc", label: "Members of Month Description", type: "textarea" },
      { key: "home.motm.viewteam", label: "Members of Month CTA" },
      { key: "section.workshops.label", label: "Workshops Label" },
      { key: "section.workshops.title", label: "Workshops Title" },
      { key: "section.workshops.desc", label: "Workshops Description", type: "textarea" },
      { key: "section.workshops.viewall", label: "Workshops CTA" },
      { key: "section.projects.label", label: "Projects Label" },
      { key: "section.projects.title", label: "Projects Title" },
      { key: "section.projects.desc", label: "Projects Description", type: "textarea" },
      { key: "section.projects.viewall", label: "Projects CTA" },
      { key: "section.cta.title", label: "Bottom CTA Title" },
      { key: "section.cta.desc1", label: "Bottom CTA Description 1", type: "textarea" },
      { key: "section.cta.desc2", label: "Bottom CTA Description 2", type: "textarea" },
      { key: "section.cta.apply", label: "Bottom CTA Primary" },
      { key: "section.cta.learn", label: "Bottom CTA Secondary" },
    ],
  },
  {
    id: "footer",
    page: "main",
    title: "Footer",
    description: "Footer brand copy, section labels, and bottom-bar text.",
    fields: [
      { key: "footer.brand.name", label: "Brand Name" },
      { key: "footer.brand.subtitle", label: "Brand Subtitle" },
      { key: "footer.brand.description", label: "Brand Description", type: "textarea" },
      { key: "footer.brand.arabic", label: "Arabic Brand Line" },
      { key: "footer.club.title", label: "Club Section Title" },
      { key: "footer.club.about", label: "Club Link: About" },
      { key: "footer.club.projects", label: "Club Link: Projects" },
      { key: "footer.club.events", label: "Club Link: Events" },
      { key: "footer.club.team", label: "Club Link: Team" },
      { key: "footer.connect.title", label: "Connect Section Title" },
      { key: "footer.connect.empty", label: "Connect: Empty State Text" },
      { key: "footer.contact.title", label: "Company Contact Title" },
      { key: "footer.contact.desc", label: "Company Contact Description", type: "textarea" },
      { key: "contact.email", label: "Company Contact Email" },
      { key: "footer.bottom.copyright", label: "Copyright", type: "textarea" },
      { key: "footer.bottom.status", label: "Status Text" },
    ],
  },
  {
    id: "about",
    page: "about",
    title: "About Page",
    description: "About page hero, mission, vision, and department section copy.",
    fields: [
      { key: "about.hero.label", label: "Hero Label" },
      { key: "about.hero.title", label: "Hero Title" },
      { key: "about.hero.accent", label: "Hero Accent" },
      { key: "about.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "about.vision.title", label: "Vision Title" },
      { key: "about.vision.body", label: "Vision Body", type: "textarea" },
      { key: "about.vision.tagline", label: "Vision Tagline", type: "textarea" },
      { key: "about.mission.title", label: "Mission Title" },
      { key: "about.mission.body", label: "Mission Body", type: "textarea" },
      { key: "about.mission.tagline", label: "Mission Tagline", type: "textarea" },
      { key: "about.values.label", label: "Values Label" },
      { key: "about.values.title", label: "Values Title" },
      { key: "about.depts.label", label: "Departments Label" },
      { key: "about.depts.title", label: "Departments Title" },
      { key: "about.depts.desc", label: "Departments Description", type: "textarea" },
      { key: "about.timeline.label", label: "Timeline Label" },
      { key: "about.timeline.title", label: "Timeline Title" },
    ],
  },
  {
    id: "departments",
    page: "about",
    title: "Departments",
    description: "Department names and short descriptions used across the public site.",
    fields: [
      { key: "dept.executive.name", label: "Executive Name" },
      { key: "dept.executive.desc", label: "Executive Description", type: "textarea" },
      { key: "dept.hr.name", label: "HR Name" },
      { key: "dept.hr.desc", label: "HR Description", type: "textarea" },
      { key: "dept.development.name", label: "Development Name" },
      { key: "dept.development.desc", label: "Development Description", type: "textarea" },
      { key: "dept.innovation.name", label: "Innovation Name" },
      { key: "dept.innovation.desc", label: "Innovation Description", type: "textarea" },
      { key: "dept.media.name", label: "Media Name" },
      { key: "dept.media.desc", label: "Media Description", type: "textarea" },
      { key: "dept.pr.name", label: "PR Name" },
      { key: "dept.pr.desc", label: "PR Description", type: "textarea" },
      { key: "dept.finance.name", label: "Finance Name" },
      { key: "dept.finance.desc", label: "Finance Description", type: "textarea" },
      { key: "dept.logistics.name", label: "Logistics Name" },
      { key: "dept.logistics.desc", label: "Logistics Description", type: "textarea" },
      { key: "dept.madarat.name", label: "Madarat Name" },
      { key: "dept.madarat.desc", label: "Madarat Description", type: "textarea" },
    ],
  },
  {
    id: "events",
    page: "events",
    title: "Events Page",
    description: "Events hero, sections, and CTA text.",
    fields: [
      { key: "events.hero.label", label: "Hero Label" },
      { key: "events.hero.title", label: "Hero Title" },
      { key: "events.hero.accent", label: "Hero Accent" },
      { key: "events.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "events.upcoming.label", label: "Upcoming Label" },
      { key: "events.upcoming.title", label: "Upcoming Title" },
      { key: "events.upcoming.desc", label: "Upcoming Description", type: "textarea" },
      { key: "events.upcoming.empty", label: "Upcoming Empty State", type: "textarea" },
      { key: "events.upcoming.seats", label: "Seats Left Label" },
      { key: "events.upcoming.seats_full", label: "Full Seats Label" },
      { key: "events.recent.label", label: "Recent Label" },
      { key: "events.recent.title", label: "Recent Title" },
      { key: "events.recent.desc", label: "Recent Description", type: "textarea" },
      { key: "events.recent.empty", label: "Recent Empty State", type: "textarea" },
      { key: "events.cta.workshops", label: "Workshops CTA" },
    ],
  },
  {
    id: "team",
    page: "team",
    title: "Team Page",
    description: "Team page hero, leadership sections, recognition, and join CTA.",
    fields: [
      { key: "team.hero.label", label: "Hero Label" },
      { key: "team.hero.title", label: "Hero Title" },
      { key: "team.hero.accent", label: "Hero Accent" },
      { key: "team.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "team.executive.label", label: "Executive Label" },
      { key: "team.executive.title", label: "Executive Title" },
      { key: "team.executive.desc", label: "Executive Description", type: "textarea" },
      { key: "team.depts.label", label: "Departments Label" },
      { key: "team.depts.title", label: "Departments Title" },
      { key: "team.depts.desc", label: "Departments Description", type: "textarea" },
      { key: "team.qa.title", label: "QA Title" },
      { key: "team.motm.label", label: "Members of Month Label" },
      { key: "team.motm.title", label: "Members of Month Title" },
      { key: "team.motm.desc", label: "Members of Month Description", type: "textarea" },
      { key: "team.motm.empty", label: "Members of Month Empty State", type: "textarea" },
      { key: "team.join.title", label: "Join CTA Title" },
      { key: "team.join.desc", label: "Join CTA Description", type: "textarea" },
      { key: "team.join.cta", label: "Join CTA Button" },
    ],
  },
  {
    id: "join",
    page: "join",
    title: "Join Page",
    description: "Join page hero, form copy, success states, and FAQ headings.",
    fields: [
      { key: "join.hero.label", label: "Hero Label" },
      { key: "join.hero.title", label: "Hero Title" },
      { key: "join.hero.accent", label: "Hero Accent" },
      { key: "join.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "join.closed.badge", label: "Closed Badge" },
      { key: "join.benefits.label", label: "Benefits Label" },
      { key: "join.benefits.title", label: "Benefits Title" },
      { key: "join.benefits.desc", label: "Benefits Description", type: "textarea" },
      { key: "join.process.label", label: "Process Label" },
      { key: "join.process.title", label: "Process Title" },
      { key: "join.process.desc", label: "Process Description", type: "textarea" },
      { key: "join.form.label", label: "Form Label" },
      { key: "join.form.title", label: "Form Title" },
      { key: "join.form.desc", label: "Form Description", type: "textarea" },
      { key: "join.form.name", label: "Name Field Label" },
      { key: "join.form.name.placeholder", label: "Name Placeholder" },
      { key: "join.form.id", label: "Student ID Label" },
      { key: "join.form.id.placeholder", label: "Student ID Placeholder" },
      { key: "join.form.email", label: "Email Label" },
      { key: "join.form.email.placeholder", label: "Email Placeholder" },
      { key: "join.form.phone", label: "Phone Label" },
      { key: "join.form.phone.placeholder", label: "Phone Placeholder" },
      { key: "join.form.major", label: "Major Label" },
      { key: "join.form.major.placeholder", label: "Major Placeholder" },
      { key: "join.form.dept", label: "Department Label" },
      { key: "join.form.dept.placeholder", label: "Department Placeholder" },
      { key: "join.form.motivation", label: "Motivation Label" },
      { key: "join.form.motivation.placeholder", label: "Motivation Placeholder", type: "textarea" },
      { key: "join.form.skills", label: "Skills Label" },
      { key: "join.form.skills.optional", label: "Skills Optional Label" },
      { key: "join.form.skills.placeholder", label: "Skills Placeholder", type: "textarea" },
      { key: "join.form.submit", label: "Submit Button" },
      { key: "join.form.submitting", label: "Submitting Button" },
      { key: "join.form.consent", label: "Consent Copy", type: "textarea" },
      { key: "join.success.title", label: "Success Title" },
      { key: "join.success.desc", label: "Success Description", type: "textarea" },
      { key: "join.success.cta", label: "Success CTA" },
      { key: "join.error.generic", label: "Generic Error", type: "textarea" },
      { key: "join.faq.label", label: "FAQ Label" },
      { key: "join.faq.title", label: "FAQ Title" },
    ],
  },
  {
    id: "projects",
    page: "projects",
    title: "Projects Page",
    description: "Projects page hero, stats, sections, and portfolio labels.",
    fields: [
      { key: "projects.hero.label", label: "Hero Label" },
      { key: "projects.hero.title", label: "Hero Title" },
      { key: "projects.hero.accent", label: "Hero Accent" },
      { key: "projects.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "projects.stats.total", label: "Stat Label: Total Projects" },
      { key: "projects.stats.active", label: "Stat Label: Active This Year" },
      { key: "projects.stats.competitions", label: "Stat Label: Competition Entries" },
      { key: "projects.stats.papers", label: "Stat Label: Research Papers" },
      { key: "projects.portfolio.label", label: "Portfolio Label" },
      { key: "projects.portfolio.title", label: "Portfolio Title" },
      { key: "projects.portfolio.desc", label: "Portfolio Description", type: "textarea" },
      { key: "projects.tech.label", label: "Tech Label" },
      { key: "projects.tech.title", label: "Tech Title" },
      { key: "projects.tech.desc", label: "Tech Description", type: "textarea" },
      { key: "projects.modal.stack", label: "Modal Tech Stack Label" },
      { key: "projects.modal.link", label: "Modal GitHub Link" },
      { key: "projects.modal.team", label: "Modal Team Label" },
      { key: "projects.modal.empty", label: "Modal Empty Team Label", type: "textarea" },
      { key: "projects.badge.featured", label: "Featured Badge" },
      { key: "projects.meta.lead", label: "Lead Prefix" },
      { key: "projects.filter.all", label: "Filter: All" },
      { key: "projects.filter.drones", label: "Filter: Drones" },
      { key: "projects.filter.robotics", label: "Filter: Robotics" },
      { key: "projects.filter.ai", label: "Filter: AI & Software" },
      { key: "projects.filter.research", label: "Filter: Research" },
      { key: "projects.card.view", label: "Card View Hint" },
    ],
  },
  {
    id: "workshops",
    page: "workshops",
    title: "Workshops Page",
    description: "Workshop page hero, live session copy, recordings, and registration labels.",
    fields: [
      { key: "workshops.hero.label", label: "Hero Label" },
      { key: "workshops.hero.title", label: "Hero Title" },
      { key: "workshops.hero.accent", label: "Hero Accent" },
      { key: "workshops.hero.desc", label: "Hero Description", type: "textarea" },
      { key: "workshops.live.title", label: "Live Section Title" },
      { key: "workshops.live.sessions", label: "Session Count Label" },
      { key: "workshops.live.past", label: "Past Live Sessions Label" },
      { key: "workshops.library.label", label: "Library Label" },
      { key: "workshops.library.title", label: "Library Title" },
      { key: "workshops.library.desc", label: "Library Description", type: "textarea" },
      { key: "workshops.badge.completed", label: "Completed Badge" },
      { key: "workshops.badge.upcoming", label: "Upcoming Badge" },
      { key: "workshops.badge.open", label: "Registration Open Badge" },
      { key: "workshops.badge.closed", label: "Registration Closed Badge" },
      { key: "workshops.badge.full", label: "Fully Booked Badge" },
      { key: "workshops.live.by", label: "Presenter Prefix" },
      { key: "workshops.live.registered", label: "Registered Label" },
      { key: "workshops.live.cta", label: "Register CTA" },
      { key: "workshops.live.fullnote", label: "Full Session Note", type: "textarea" },
      { key: "workshops.modal.success.title", label: "Modal Success Title" },
      { key: "workshops.modal.success.desc", label: "Modal Success Description", type: "textarea" },
      { key: "workshops.modal.success.done", label: "Modal Done Button" },
      { key: "workshops.modal.error", label: "Modal Error", type: "textarea" },
      { key: "workshops.modal.live", label: "Live Workshop Badge" },
      { key: "workshops.modal.fullName", label: "Full Name Label" },
      { key: "workshops.modal.fullName.placeholder", label: "Full Name Placeholder" },
      { key: "workshops.modal.email", label: "Email Label" },
      { key: "workshops.modal.email.placeholder", label: "Email Placeholder" },
      { key: "workshops.modal.universityId", label: "University ID Label" },
      { key: "workshops.modal.phone", label: "Phone Label" },
      { key: "workshops.modal.optional", label: "Optional Placeholder" },
      { key: "workshops.modal.department", label: "Department Label" },
      { key: "workshops.modal.department.placeholder", label: "Department Placeholder" },
      { key: "workshops.modal.notes", label: "Notes Label" },
      { key: "workshops.modal.notes.placeholder", label: "Notes Placeholder", type: "textarea" },
      { key: "workshops.modal.cancel", label: "Cancel Button" },
      { key: "workshops.modal.registering", label: "Registering Button" },
      { key: "workshops.modal.register", label: "Register Button" },
    ],
  },
];

export function parseCollection<T>(value: unknown, fallback: T): T {
  return Array.isArray(value) ? (value as T) : fallback;
}

export function getCustomSegmentsKey(page: PublicPageKey) {
  return `${page}.customSegments`;
}

export function localizedValue(
  lang: "en" | "ar",
  english: string | null | undefined,
  arabic: string | null | undefined,
) {
  if (lang === "ar") return arabic || english || "";
  return english || arabic || "";
}
