import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from 'apps/nestar-api/src/libs/enums/common.enum';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		console.info('--- @guard() Authentication [AuthGuard] ---');

		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			//context.getArgByIndex(2) => the GraphQL context (includes request, response, etc.)

			const bearerToken = request.headers.authorization;
			if (!bearerToken) {
				console.log('❌ No authorization token provided');
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			const token = bearerToken.split(' ')[1]; // Index 1 is token
			if (!token) {
				console.log('❌ Invalid token format');
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			const authMember = await this.authService.verifyToken(token);
			if (!authMember) {
				console.log('❌ Token verification failed');
				throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
			}

			console.log('✅ Authentication successful for:', authMember.memberNick);
			request.body.authMember = authMember;

			return true;
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
