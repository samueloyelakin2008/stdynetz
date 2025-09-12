export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    studyGroupInvites: boolean;
    timetableUpdates: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface Course {
  _id: string;
  code: string;
  name: string;
  description: string;
  instructor: string;
  credits: number;
  schedule: CourseSchedule[];
  capacity: number;
  enrolled: number;
  prerequisites: string[];
  tags: string[];
  department: string;
  semester: string;
  year: number;
}

export interface CourseSchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  location: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
}

export interface Registration {
  _id: string;
  userId: string;
  courseId: string;
  registeredAt: Date;
  status: 'registered' | 'waitlisted' | 'dropped';
  grade?: string;
}

export interface StudyGroup {
  _id: string;
  name: string;
  description: string;
  courseIds: string[];
  createdBy: string;
  members: StudyGroupMember[];
  maxMembers: number;
  isPrivate: boolean;
  tags: string[];
  meetingInfo?: MeetingInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'inactive';
}

export interface MeetingInfo {
  schedule: string;
  location: string;
  virtual: boolean;
  meetingUrl?: string;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

export interface ChatMessage {
  id: string;
  studyGroupId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  message: string;
  timestamp: number;
  type: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  edited?: boolean;
  editedAt?: number;
}

export interface FileUpload {
  _id: string;
  filename: string;
  originalName: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  studyGroupId?: string;
  courseId?: string;
  tags: string[];
  description?: string;
  uploadedAt: Date;
}

export interface Timetable {
  _id: string;
  userId: string;
  semester: string;
  year: number;
  courses: TimetableCourse[];
  conflicts: TimetableConflict[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  schedule: CourseSchedule[];
  color: string;
}

export interface TimetableConflict {
  type: 'time' | 'prerequisite' | 'capacity';
  courseIds: string[];
  message: string;
  severity: 'warning' | 'error';
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'registration' | 'studyGroup' | 'timetable' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}