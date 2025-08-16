import { Logger } from '@nestjs/common';
import { OnGatewayInit,
         SubscribeMessage,
         WebSocketGateway,
        WebSocketServer
       } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';

interface MessagePayload {
	event: string;
	text: string;
}

interface InfoPayload {
	event: string;
	totalClients: number;
}

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateAway');
	private summaryClient: number = 0;

  @WebSocketServer()
	server: Server;

	public afterInit(server: Server) {
		this.logger.verbose(`Web Server Initialized & total: ${this.summaryClient}`);
	}

	handleConnection(client: WebSocket, ...args: any) {
		this.summaryClient++;
		this.logger.verbose(`Client Connected total: [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
		};

		this.emitMessage(infoMsg);
	}

	handleDisconnect(client: WebSocket) {
		this.summaryClient--;
		this.logger.verbose(`Client Disconnected left total: [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
		};
		this.broadCastMessage(client, infoMsg);
	}

	private broadCastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: string): Promise<void> {
		const newMessage: MessagePayload = {
			event: 'message',
			text: payload,
		};

		this.logger.verbose(`NEW MESSAGE: ${payload}`);
		this.emitMessage(newMessage);
	}

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
}
