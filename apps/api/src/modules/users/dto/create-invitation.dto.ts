import { IsEmail, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '../enums/user-role.enum';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.MEMBER,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    description: 'Organization ID where the user will be invited',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Optional message to include with the invitation',
    example: 'Welcome to our team!',
    required: false,
  })
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'Custom fields to include with the invitation',
    example: { department: 'Sales', location: 'New York' },
    required: false,
  })
  @IsOptional()
  customFields?: Record<string, any>;
}
