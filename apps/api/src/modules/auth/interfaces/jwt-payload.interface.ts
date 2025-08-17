import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  organizationId: string;
  iat?: number; // Issued at
  exp?: number; // Expiration time
}
