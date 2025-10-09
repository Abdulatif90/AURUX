import { Controller, Get, Logger } from '@nestjs/common';
import { NestarBatchService } from './aurux-batch.service';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import { BATCH_ROLLBACK, BATCH_TOP_AGENTS, BATCH_TOP_PROPERTIES } from './lib/config'



@Controller()
export class NestarBatchController {
  constructor(private readonly nestarBatchService: NestarBatchService) {}
  private logger: Logger = new Logger('BatchController');

	@Timeout(1000)
	handleTimeout() {
		this.logger.debug('BATCH SERVER READY');
	}

	@Cron('00 * * * * *', { name: BATCH_ROLLBACK })
	public async batchRollback() {
		try {
			this.logger['context'] = BATCH_ROLLBACK;
			this.logger.debug('EXECTUTED');
			await this.nestarBatchService.batchRollback();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('20 * * * * *', { name: BATCH_TOP_PROPERTIES })
	public async batchTopProperties() {
		try {
			this.logger['context'] = BATCH_TOP_PROPERTIES;
			this.logger.debug('EXECTUTED');
			await this.nestarBatchService.batchTopProperties();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('40 * * * * *', { name: BATCH_TOP_AGENTS })
	public async batchTopAgents() {
		try {
			this.logger['context'] = BATCH_TOP_AGENTS;
			this.logger.debug('EXECTUTED');
			await this.nestarBatchService.batchTopAgents();
		} catch (err) {
			this.logger.error(err);
		}
	}

	// @Interval(1000)
	// handleInterval() {
	// 	this.logger.debug('Interval Test');
	// }

  @Get()
  getHello(): string {
    return this.nestarBatchService.getHello();
  }
}
