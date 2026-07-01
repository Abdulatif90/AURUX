import { MemberService } from '../member/member.service';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ObjectId } from 'bson';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { ViewService } from '../view/view.service';
import { AllBoardArticlesInquiry, BoardArticleInput, BoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { StatisticModifier } from '../../libs/types/common';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { escapeRegExp, lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';

@Injectable()
export class BoardArticleService {
	private readonly logger = new Logger(BoardArticleService.name);

  constructor(
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		private readonly memberService: MemberService,
		private readonly viewService: ViewService,
    private readonly likeService: LikeService,
	) {}

	public async createBoardArticle(memberId: ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		input.memberId = memberId;
		const session = await this.boardArticleModel.startSession();
		try {
			const result = await session.withTransaction(async () => {
				const [created] = await this.boardArticleModel.create([input], { session });
				await this.memberService.memberStatsEditor(
					{ _id: created.memberId, targetKey: 'memberArticles', modifier: 1 },
					session,
				);
				return created;
			});
			return result;
		} catch (err) {
			this.logger.error(`createBoardArticle: ${err.message}`, err.stack);
			throw new BadRequestException(Message.CREATE_FAILED);
		} finally {
			await session.endSession();
		}
	}

	public async getBoardArticle(memberId: ObjectId | null, articleId: ObjectId): Promise<BoardArticle> {
		const search: FilterQuery<BoardArticle> = {
			_id: articleId,
			articleStatus: BoardArticleStatus.ACTIVE,
		};

		const targetBoardArticle: BoardArticle | null = await this.boardArticleModel.findOne(search).lean().exec();
		if (!targetBoardArticle) throw new NotFoundException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId: memberId, viewRefId: articleId, viewGroup: ViewGroup.ARTICLE };
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				targetBoardArticle.articleViews++;
				this.logger.debug(`articleViews incremented for ${articleId}: ${targetBoardArticle.articleViews}`);
			}
		}

    const likeInput: LikeInput | null = memberId
			? { memberId, likeRefId: articleId, likeGroup: LikeGroup.ARTICLE }
			: null;
		targetBoardArticle.meLiked = likeInput ? await this.likeService.checkLikeExistence(likeInput) : [];
		//meFollowed

		targetBoardArticle.memberData = await this.memberService.getMember(null, targetBoardArticle.memberId);
		return targetBoardArticle;
	}

	public async updateBoardArticle(memberId: ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		const { _id, ...updateData } = input;

		const session = await this.boardArticleModel.startSession();
		try {
			const result = await session.withTransaction(async () => {
				const updated = await this.boardArticleModel
					.findOneAndUpdate(
						{ _id, memberId: memberId, articleStatus: BoardArticleStatus.ACTIVE },
						updateData,
						{ new: true, session },
					)
					.exec();
				if (!updated) throw new NotFoundException(Message.UPDATE_FAILED);

				if (updateData.articleStatus === BoardArticleStatus.DELETE) {
					await this.memberService.memberStatsEditor(
						{ _id: memberId, targetKey: 'memberArticles', modifier: -1 },
						session,
					);
				}

				return updated;
			});
			return result;
		} finally {
			await session.endSession();
		}
	}

  public async likeTargetBoardArticle(memberId: ObjectId, likeRefId: ObjectId): Promise<BoardArticle> {
		const target: BoardArticle | null = await this.boardArticleModel
			.findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE })
			.lean()
			.exec();
		if (!target) throw new NotFoundException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.ARTICLE,
		};

		const session = await this.boardArticleModel.startSession();
		try {
			const result = await session.withTransaction(async () => {
				const modifier: number = await this.likeService.toggleLike(input, session);
				const updated = await this.boardArticleStatsEditor(
					{ _id: likeRefId, targetKey: 'articleLikes', modifier },
					session,
				);
				if (!updated) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
				return updated;
			});
			return result;
		} finally {
			await session.endSession();
		}
	}

	public async getBoardArticles(memberId: ObjectId, input: BoardArticlesInquiry): Promise<BoardArticles> {
		const { articleCategory, text } = input.search;
		const match: FilterQuery<BoardArticle> = { articleStatus: BoardArticleStatus.ACTIVE };
		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (articleCategory) match.articleCategory = articleCategory;

		if (text) match.articleTitle = { $regex: new RegExp(escapeRegExp(text), 'i') };
		if (input.search?.memberId) {
			match.memberId = shapeIntoMongoObjectId(input.search.memberId);
		}

		const result = await this.boardArticleModel
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
  public async getAllBoardArticlesByAdmin(memberId: ObjectId, input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		const { articleStatus, articleCategory } = input.search;
		const match: FilterQuery<BoardArticle> = {};
		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (articleStatus) match.articleStatus = articleStatus;
		if (articleCategory) match.articleCategory = articleCategory;

		const result = await this.boardArticleModel
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
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}

	public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
		const { _id, ...updateData } = input;

		const session = await this.boardArticleModel.startSession();
		try {
			const result = await session.withTransaction(async () => {
				const updated = await this.boardArticleModel
					.findOneAndUpdate({ _id, articleStatus: BoardArticleStatus.ACTIVE }, updateData, { new: true, session })
					.exec();
				if (!updated) throw new NotFoundException(Message.UPDATE_FAILED);

				if (updateData.articleStatus === BoardArticleStatus.DELETE) {
					await this.memberService.memberStatsEditor(
						{ _id: updated.memberId, targetKey: 'memberArticles', modifier: -1 },
						session,
					);
				}
				return updated;
			});
			return result;
		} finally {
			await session.endSession();
		}
	}

	public async removeBoardArticleByAdmin(articleId: ObjectId): Promise<BoardArticle> {
		const search: FilterQuery<BoardArticle> = {
			_id: articleId,
			articleStatus: BoardArticleStatus.DELETE,
		};
		const result = await this.boardArticleModel.findOneAndDelete(search).exec();
		if (!result) throw new NotFoundException(Message.REMOVE_FAILED);
		return result;
	}

	public async boardArticleStatsEditor(input: StatisticModifier<BoardArticle>, session?: ClientSession): Promise<BoardArticle | null> {
		const { _id, targetKey, modifier } = input;
		const inc: Record<string, number> = {};
		inc[targetKey] = modifier;
		const updated = await this.boardArticleModel
			.findByIdAndUpdate(_id, { $inc: inc }, { new: true, session })
			.lean()
			.exec();

		return updated as BoardArticle | null;
	}
}
