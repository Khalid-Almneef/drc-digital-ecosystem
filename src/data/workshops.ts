export interface Workshop {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: "Drones" | "Robotics" | "AI" | "Fabrication" | "Racing" | "Software";
  categoryAr: string;
  duration: number;
  date: string;
  presenter: string;
  videoUrl: string;
}

export const CATEGORY_COLORS: Record<Workshop["category"], string> = {
  Drones: "var(--cat-drones)",
  Robotics: "var(--cat-robotics)",
  AI: "var(--cat-ai)",
  Fabrication: "var(--cat-fabrication)",
  Racing: "var(--cat-racing)",
  Software: "var(--cat-software)",
};

export const workshops: Workshop[] = [
  {
    id: 1,
    title: "Drone Assembly Fundamentals",
    titleAr: "أساسيات تجميع الطائرات",
    description: "Learn how to build a quadcopter from scratch — frame selection, motor mounting, ESC wiring, and your first test flight.",
    descriptionAr: "تعلم كيفية بناء طائرة رباعية من الصفر — اختيار الهيكل وتركيب المحركات وتوصيل ESC وأول رحلة تجريبية.",
    category: "Drones",
    categoryAr: "طائرات",
    duration: 75,
    date: "Feb 2025",
    presenter: "Joud Al-Mazrooa",
    videoUrl: "#",
  },
  {
    id: 2,
    title: "Arduino for Robotics",
    titleAr: "أردوينو للروبوتات",
    description: "Introduction to Arduino programming with real robotics applications — sensors, servo control, and autonomous movement.",
    descriptionAr: "مقدمة في برمجة أردوينو مع تطبيقات روبوتية حقيقية — أجهزة الاستشعار والتحكم في المؤازرات والحركة المستقلة.",
    category: "Robotics",
    categoryAr: "روبوتات",
    duration: 90,
    date: "Mar 2025",
    presenter: "Abdulaziz Al-Byood",
    videoUrl: "#",
  },
  {
    id: 3,
    title: "Computer Vision & AI",
    titleAr: "رؤية الحاسوب والذكاء الاصطناعي",
    description: "Using OpenCV and YOLO for real-time object detection on embedded systems — applied to drone navigation and robotics.",
    descriptionAr: "استخدام OpenCV وYOLO للكشف عن الأجسام في الوقت الفعلي على الأنظمة المدمجة مطبقة على الطائرات والروبوتات.",
    category: "AI",
    categoryAr: "ذكاء اصطناعي",
    duration: 100,
    date: "Apr 2025",
    presenter: "Khalid Al-Mneef",
    videoUrl: "#",
  },
  {
    id: 4,
    title: "3D Printing for Prototyping",
    titleAr: "الطباعة ثلاثية الأبعاد للنمذجة",
    description: "From CAD to print — designing structural drone parts, robotic enclosures, and functional prototypes using FDM printers.",
    descriptionAr: "من التصميم إلى الطباعة — تصميم هياكل الطائرات وأغطية الروبوتات والنماذج الأولية باستخدام طابعات FDM.",
    category: "Fabrication",
    categoryAr: "تصنيع",
    duration: 60,
    date: "Mar 2025",
    presenter: "Bader Bedas",
    videoUrl: "#",
  },
  {
    id: 5,
    title: "FPV Racing Setup & Tuning",
    titleAr: "إعداد وضبط سباق FPV",
    description: "Everything you need to get into FPV racing — camera setup, VTX configuration, Betaflight PID tuning, and race strategy.",
    descriptionAr: "كل ما تحتاجه للدخول في سباقات FPV — إعداد الكاميرا وتكوين VTX وضبط PID في Betaflight واستراتيجية السباق.",
    category: "Racing",
    categoryAr: "سباقات",
    duration: 80,
    date: "Jan 2025",
    presenter: "Yazan Hussain",
    videoUrl: "#",
  },
  {
    id: 6,
    title: "ROS 2 Introduction",
    titleAr: "مقدمة في ROS 2",
    description: "Getting started with Robot Operating System 2 — nodes, topics, services, and building your first autonomous behavior.",
    descriptionAr: "البدء مع نظام تشغيل الروبوت 2 — العقد والمواضيع والخدمات وبناء أول سلوك مستقل.",
    category: "Software",
    categoryAr: "برمجيات",
    duration: 110,
    date: "Apr 2025",
    presenter: "Khalid Al-Salem",
    videoUrl: "#",
  },
];
