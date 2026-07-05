export const UserRole = {
  DOCTOR: 'doctor',
  ASSISTANT: 'assistant',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  clinicId: string;
  doctorCode?: string;
  isProfileComplete: boolean;
  soloMode?: boolean;
  signatureUrl?: string;
  specialty?: string;
  regNumber?: string;
  qualification?: string;
  experienceYears?: number;
  city?: string;
  address?: string;
  createdAt: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
  role: UserRole;
}

export interface OTPRequest {
  phone: string;
  role: UserRole;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
