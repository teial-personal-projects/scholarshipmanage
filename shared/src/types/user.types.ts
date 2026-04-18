export interface User {
  userId: number; // Auto-generated primary key (BIGSERIAL)
  authUserId: string; // Supabase Auth user ID (UUID)
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 