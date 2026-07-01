import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ObjectId } from 'bson';
import { AgentPropertiesInquiry,
        AllPropertiesInquiry,
        PropertiesInquiry,
        PropertyInput,
        OrdinaryInquiry
       } from '../../libs/dto/property/property.input';
import { Properties, Property } from '../../libs/dto/property/property';
import {Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier } from '../../libs/types/common';
import { ViewService } from '../view/view.service';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyUpdate } from  '../../libs/dto/property/property.update';
import * as moment from 'moment';
import { escapeRegExp, lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';


@Injectable ()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<Property | null>,
    private memberService: MemberService,
    private viewService: ViewService,
    private readonly likeService: LikeService,
  ){}

	public async createProperty(input: PropertyInput): Promise<Property> {
		if (!input.propertyImages || input.propertyImages.length === 0) {
			throw new BadRequestException('Property images are required');
		}
		if (!input.propertyStatus) input.propertyStatus = PropertyStatus.ACTIVE;

		const session: ClientSession = await this.propertyModel.db.startSession();
		let result: Property;
		try {
			await session.withTransaction(async () => {
				const docs = await this.propertyModel.create([input], { session });
				result = docs[0];
				await this.memberService.memberStatsEditor(
					{ _id: result.memberId, targetKey: 'memberProperties', modifier: 1 },
					session,
				);
			});
		} catch (err) {
			this.logger.error(`createProperty: ${err.message}`, err.stack);
			throw new BadRequestException(Message.CREATE_FAILED);
		} finally {
			await session.endSession();
		}
		return result!;
	}
  public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		const search: FilterQuery<Property> = {
			_id: propertyId,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		const targetProperty: Property | null = await this.propertyModel.findOne(search).lean().exec();
		if (!targetProperty) throw new NotFoundException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
			console.log('Property view check for:', { memberId, propertyId });
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				console.log('Incrementing property views for propertyId:', propertyId);
				await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
				targetProperty.propertyViews++;
				console.log('Property view count updated to:', targetProperty.propertyViews);
			}
		}

    const likeInput = { memberId: memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY };
		targetProperty.meLiked = await this.likeService.checkLikeExistence(likeInput as LikeInput);

		targetProperty.memberData = await this.memberService.getMember(null, targetProperty.memberId);
		return targetProperty;
	}

  public async likeTargetProperty(memberId: ObjectId, likeRefId: ObjectId): Promise<Property> {
			const target: Property | null = await this.propertyModel.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE });
			if (!target) throw new NotFoundException(Message.NO_DATA_FOUND);

			const input: LikeInput = {
				memberId: memberId,
				likeRefId: likeRefId,
				likeGroup: LikeGroup.PROPERTY,
			};

			const modifier: number = await this.likeService.toggleLike(input)
			const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: 'propertyLikes', modifier: modifier });

			if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
			return result;
		}


  public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		const { _id, propertyStatus, ...updateData } = input;

		if (propertyStatus === PropertyStatus.SOLD) updateData.soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) updateData.deletedAt = moment().toDate();

		const search: FilterQuery<Property> = { _id, memberId };
		const result = await this.propertyModel.findOneAndUpdate(search, updateData, { new: true }).exec();
		if (!result) throw new NotFoundException(Message.UPDATE_FAILED);

		if (updateData.soldAt || updateData.deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

  public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: FilterQuery<Property> = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupAuthMemberLiked(memberId),
              lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } }
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}

	private shapeMatchQuery(match: FilterQuery<Property>, input: PropertiesInquiry): void {
		const search = input.search;
		if (!search) return;
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			periodsRange,
			squaresRange,
			pricesRange,
			options,
			text,
		} = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
		if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
		if (bedsList && bedsList.length) match.propertyBeds = { $in: bedsList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(escapeRegExp(text), 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

  // getFavorites
	public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		return await this.likeService.getFavoriteProperties(memberId, input)
	}


  // getVisited
		public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
			return await this.viewService.getVisitedProperties(memberId, input)
		}


  public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: FilterQuery<Property> = { memberId: memberId, propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE } };

		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}
  public async getAllPropertiesByAdmin(memberId: ObjectId, input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: FilterQuery<Property> = {};
		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = propertyLocationList;

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}
  public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
			const { _id, propertyStatus, ...updateData } = input;
			const search: FilterQuery<Property> = {
				_id,
				propertyStatus: PropertyStatus.ACTIVE
			}

			if (propertyStatus === PropertyStatus.SOLD) updateData.soldAt = moment().toDate();
			if (propertyStatus === PropertyStatus.DELETE) updateData.deletedAt = moment().toDate();

			const result: Property | null = await this.propertyModel
				.findOneAndUpdate(search, updateData, { new: true })
				.exec();
			if (!result) throw new NotFoundException(Message.UPDATE_FAILED);

			if (updateData.soldAt || updateData.deletedAt) {
				await this.memberService.memberStatsEditor({
					_id: result.memberId,
					targetKey: "memberProperties",
					modifier: -1
				})
			}
			return result;
		}
public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: FilterQuery<Property> = {
			_id: propertyId,
			propertyStatus: PropertyStatus.DELETE,
		};
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new NotFoundException(Message.REMOVE_FAILED);
		return result;
	}
  public async propertyStatsEditor(input: StatisticModifier<Property>, session?: ClientSession): Promise<Property | null> {
		const { _id, targetKey, modifier } = input;
		const inc: Record<string, number> = {};
		inc[targetKey] = modifier;
		const updated = await this.propertyModel
			.findByIdAndUpdate(_id, { $inc: inc }, { new: true, session })
			.lean()
			.exec();

		return updated as Property | null;
	}
}
