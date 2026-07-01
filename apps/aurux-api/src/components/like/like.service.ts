import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ObjectId } from 'bson';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput } from '../../libs/dto/like/like.input';
import { Message } from '../../libs/enums/common.enum';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Properties } from '../../libs/dto/property/property';
import { LikeGroup } from '../../libs/enums/like.enum';
import { lookupFavorite } from '../../libs/config';

@Injectable()
export class LikeService {
    private readonly logger = new Logger(LikeService.name);
    constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

    public async toggleLike(input: LikeInput, session?: ClientSession): Promise<number> {
		const search: FilterQuery<Like> = { memberId: input.memberId, likeRefId: input.likeRefId },
			exist = await this.likeModel.findOne(search).session(session ?? null).exec();
		let modifier = 1;

		if (exist) {
			await this.likeModel.findOneAndDelete(search).session(session ?? null).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create([input], { session });
			} catch (err) {
				this.logger.error(`toggleLike: ${err.message}`, err.stack);
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}
		return modifier;
	}

  public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
		const { memberId, likeRefId } = input;
		const result = await this.likeModel.findOne({ memberId: memberId, likeRefId: likeRefId }).exec();
		return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
	}

  // getFavoriteProperties
  
	public async getFavoriteProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		const { page, limit } = input;
		const match: FilterQuery<Like> = { likeGroup: LikeGroup.PROPERTY, memberId: memberId };

		const data: any[] = await this.likeModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'properties',
						localField: 'likeRefId',
						foreignField: '_id',
						as: 'favoriteProperty',
					},
				},
				{ $unwind: '$favoriteProperty' },
				{
					$facet: {
						// integrate properties information to the list
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupFavorite,
							{ $unwind: '$favoriteProperty.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Properties = {list: [], metaCounter: data[0].metaCounter}
		result.list = data[0].list.map((ele) => ele.favoriteProperty)
		return result;
	}
}
