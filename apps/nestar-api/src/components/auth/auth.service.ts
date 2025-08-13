import { Injectable }  from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { T } from '../../libs/types/common';
import { JwtService } from "@nestjs/jwt";
import { shapeIntoMongoObjectId } from '../../libs/config';



@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
  ) {}

  public async hashPassword(memberPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash( memberPassword, salt);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
  public async createToken(member: Member): Promise<string> {

    const payload: T = {};
    Object.keys(member['_doc'] ? member['_doc']: member).map((key) => {
      payload[key] = member['_doc'][key];
    });

    delete payload.memberPassword; // Remove password from token payload
    console.log('Payload for JWT:', payload);

    return this.jwtService.signAsync(payload);
  }
  public async verifyToken (token: string): Promise<Member> {
		const member = await this.jwtService.verifyAsync(token);
    member._id = shapeIntoMongoObjectId(member._id);
    console.log('Decoded member from token:', member);
		return member;
	}
}
