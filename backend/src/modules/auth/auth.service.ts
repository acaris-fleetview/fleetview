import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email, active: true } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');
    const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.orgId };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

    async register(email: string, password: string, name: string) {
          const existing = await this.users.findOne({ where: { email } });
          if (existing) throw new ConflictException('Email deja utilise');
          const passwordHash = await bcrypt.hash(password, 10);
          const user = this.users.create({ email, passwordHash, name, role: 'admin', active: true , orgId: 'acaris'});
          await this.users.save(user);
          const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.orgId };
          return {
                  access_token: this.jwt.sign(payload),
                  user: { id: user.id, email: user.email, name: user.name, role: user.role },
          };
    }

  async validateUser(id: string): Promise<User> {
    return this.users.findOne({ where: { id, active: true } });
  }
}
