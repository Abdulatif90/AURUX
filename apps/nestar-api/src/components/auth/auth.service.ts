import { Injectable }  from "@nestjs/common";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {

  public async hashPassword(memberPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash( memberPassword, salt);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
