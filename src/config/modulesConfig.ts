import rawModulesConfig from './modulesConfig.json';

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'time' | 'enum' | 'url';
  isPrimary?: boolean;
  isForeignKey?: boolean;
  targetModule?: string | null;
  options?: string[] | null;
  filterable?: boolean;
}

export interface ModuleConfig {
  id: string;
  sheetName: string;
  number: string;
  title: string;
  description: string;
  icon: string;
  primaryId: string;
  columnCount: number;
  columns: ColumnConfig[];
}

export const MODULES_CONFIG: Record<string, ModuleConfig> = rawModulesConfig as unknown as Record<string, ModuleConfig>;

export const MODULE_ORDER = [
  'students',
  'assessment-attempts',
  'assessment-scores',
  'career-profiles',
  'student-files',
  'sessions',
  'attendance',
  'student-submissions',
  'companies',
  'opportunities',
  'applications'
];

export const getModuleConfig = (id: string): ModuleConfig | undefined => {
  return MODULES_CONFIG[id];
};

export const getModuleByPrimaryId = (primaryIdName: string): ModuleConfig | undefined => {
  return Object.values(MODULES_CONFIG).find(m => m.primaryId === primaryIdName);
};
