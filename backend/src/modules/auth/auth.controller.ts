import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString } from 'class-validator';

class LoginDto {
    @IsEmail() email: string;
    @IsString() password: string;
}

class RegisterDto {
    @IsEmail() email: string;
    @IsString() password: string;
    @IsString() name: string;
}

@ApiTags('Auth')
  @Controller('auth')
  export class AuthController {
    constructor(private auth: AuthService) {}

  @Post('login')
    @HttpCode(200)
    @ApiOperation({ summary: 'Connexion utilisateur' })
    login(@Body() dto: LoginDto) {
          return this.auth.login(dto.email, dto.password);
    }

  @Post('register')
    @HttpCode(201)
    @ApiOperation({ summary: 'Créer un utilisateur' })
    register(@Body() dto: RegisterDto) {
          return this.auth.register(dto.email, dto.password, dto.name);
    }
}
