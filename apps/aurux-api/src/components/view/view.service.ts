import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { ObjectId } from 'bson';
import { View } from  '../../libs/dto/view/view';
import { ViewInput } from   '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Properties } from '../../libs/dto/property/property';
import { lookupVisit } from '../../libs/config';

const DUPLICATE_KEY_ERROR_CODE = 11000;

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	public async recordView(input: ViewInput): Promise<View | null> {
		try {
			return await this.viewModel.create({
				...input,
				memberId: new Types.ObjectId(input.memberId),
				viewRefId: new Types.ObjectId(input.viewRefId),
			});
		} catch (err: unknown) {
			if (err instanceof MongoServerError && err.code === DUPLICATE_KEY_ERROR_CODE) return null;
			throw err;
		}
	}

  // getVisitedProperties

	public async getVisitedProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		const { page, limit } = input;
		const match: FilterQuery<View> = { viewGroup: ViewGroup.PROPERTY, memberId: memberId };

		const data: any[] = await this.viewModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'properties',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedProperty',
					},
				},
				{ $unwind: '$visitedProperty' },
				{
					$facet: {
						// integrate properties information to the list
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupVisit,
							{ $unwind: '$visitedProperty.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Properties = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.visitedProperty);
		return result;
	}
}
