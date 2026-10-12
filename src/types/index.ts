export type VerificationStatus = 'self_reported' | 'pending' | 'verified' | 'rejected';
export const feedbackCategories = ['Suggestion', 'Bug report', 'General feedback'] as const;
export interface StudentFeedback {
  feedbackId: string;
  collegeId: string;
  category: (typeof feedbackCategories)[number];
  subject: string;
  message: string;
}
export interface FeedbackReceipt {
  feedbackId: string;
  createdAt: string;
}
export interface Student {
  collegeId: string;
  collegeEmail: string;
  fullName: string;
  branch: string;
  year: string;
  headline: string;
  about: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
}
export interface Skill {
  skillId: string;
  collegeId: string;
  skillName: string;
  sortOrder: number;
}
export interface Project {
  projectId: string;
  collegeId: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl: string;
  liveUrl: string;
  imageUrl: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}
export interface Experience {
  experienceId: string;
  collegeId: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  proofUrl: string;
  isPublicProof?: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}
export const categories = [
  'Certification',
  'Conference',
  'Workshop',
  'Competition',
  'Club Activity',
  'Volunteering',
  'Leadership',
  'Community Service',
  'Academic Achievement',
  'Hackathon',
  'Other',
] as const;
export type Category = (typeof categories)[number];
export interface Activity {
  activityId: string;
  collegeId: string;
  category: Category;
  title: string;
  organization: string;
  activityDate: string;
  description: string;
  proofUrl: string;
  isPublicProof?: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}
export interface ProfessionalLinks {
  collegeId: string;
  linkedin: string;
  github: string;
  leetcode: string;
  website: string;
  other: string;
  publicEmail?: string;
  phone?: string;
  showEmail?: boolean;
  showPhone?: boolean;
}
export const sections = [
  'About',
  'Education',
  'Skills',
  'Projects',
  'Experience',
  'Certifications',
  'Achievements',
  'Workshops & Conferences',
  'Leadership',
  'Volunteering',
  'Contact',
] as const;
export type Section = (typeof sections)[number];
export interface PortfolioSettings {
  collegeId: string;
  theme: 'Minimal' | 'Modern' | 'Developer';
  font: 'Inter' | 'Poppins' | 'DM Sans';
  accent: string;
  sectionOrder: Section[];
  hiddenSections: Section[];
  published: boolean;
  updatedAt: string;
}
export interface Portfolio {
  student: Student;
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  activities: Activity[];
  links: ProfessionalLinks;
  settings: PortfolioSettings;
}
export interface Session {
  collegeId: string;
  token: string;
}
export type RecordKind = 'project' | 'experience' | 'activity';
export type StudentRecord = Project | Experience | Activity;
export const accents = ['#4655d5', '#16786b', '#a34f32', '#8554bd', '#236eaa', '#b04474'];
export function emptyPortfolio(collegeId: string, collegeEmail: string): Portfolio {
  const now = new Date().toISOString();
  return {
    student: {
      collegeId,
      collegeEmail,
      fullName: '',
      branch: '',
      year: '',
      headline: '',
      about: '',
      photoUrl: '',
      createdAt: now,
      updatedAt: now,
    },
    skills: [],
    projects: [],
    experiences: [],
    activities: [],
    links: {
      collegeId,
      linkedin: '',
      github: '',
      leetcode: '',
      website: '',
      other: '',
      publicEmail: '',
      phone: '',
      showEmail: false,
      showPhone: false,
    },
    settings: {
      collegeId,
      theme: 'Modern',
      font: 'Inter',
      accent: accents[0],
      sectionOrder: [...sections],
      hiddenSections: [],
      published: false,
      updatedAt: now,
    },
  };
}

export type PortfolioData = Portfolio;
export type APIResponse<T> = { success: true; data: T } | { success: false; message: string };
export type UploadCategory =
  'profile' | 'projects' | 'certificates' | 'internships' | 'achievements' | 'other';
export interface UploadRequest {
  collegeId: string;
  category: UploadCategory;
  fileName: string;
  mimeType: string;
  base64: string;
  uploadId: string;
}
export interface UploadedFile {
  fileId: string;
  viewUrl: string;
  fileName: string;
  mimeType: string;
  public: boolean;
  mediaUrl: string;
}
