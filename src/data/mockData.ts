import rawData from './mockData.json';

export interface DatabaseState {
  startHere: any;
  students: any[];
  assessmentAttempts: any[];
  assessmentScores: any[];
  careerProfiles: any[];
  studentFiles: any[];
  sessions: any[];
  attendance: any[];
  sessionTasks: any[];
  studentSubmissions: any[];
  companies: any[];
  opportunities: any[];
  applications: any[];
  applicationHistory: any[];
  commitments: any[];
  finance: any[];
}

export const initialDatabase: DatabaseState = rawData as DatabaseState;

export const MODULE_DATA_KEY_MAP: Record<string, keyof DatabaseState> = {
  'students': 'students',
  'assessment-attempts': 'assessmentAttempts',
  'assessment-scores': 'assessmentScores',
  'career-profiles': 'careerProfiles',
  'student-files': 'studentFiles',
  'sessions': 'sessions',
  'attendance': 'attendance',
  'session-tasks': 'sessionTasks',
  'student-submissions': 'studentSubmissions',
  'companies': 'companies',
  'opportunities': 'opportunities',
  'applications': 'applications',
  'application-history': 'applicationHistory',
  'commitments': 'commitments',
  'finance': 'finance',
};
