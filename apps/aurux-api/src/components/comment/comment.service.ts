import { PropertyService } from '../property/property.service';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ObjectId } from 'bson';
import { MemberService } from '../member/member.service';
import { CommentInput, CommentsInquiry } from   '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { StatisticModifier } from '../../libs/types/common';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { BoardArticleService } from '../board-article/board-article.service';
import { Comments, Comment } from '../../libs/dto/comment/comment';
import { lookupMember } from '../../libs/config';

@Injectable()
export class CommentService {
	private readonly logger = new Logger(CommentService.name);

	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly memberService: MemberService,
		private readonly propertyService: PropertyService,
		private readonly boardArticleService: BoardArticleService,
	) {}

	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;
		const session: ClientSession = await this.commentModel.db.startSession();
		let result: Comment;
		try {
			await session.withTransaction(async () => {
				const docs = await this.commentModel.create([input], { session });
				result = docs[0];

				switch (input.commentGroup) {
					case CommentGroup.PROPERTY:
						await this.propertyService.propertyStatsEditor(
							{ _id: input.commentRefId, targetKey: 'propertyComments', modifier: 1 },
							session,
						);
						break;
					case CommentGroup.ARTICLE:
						await this.boardArticleService.boardArticleStatsEditor(
							{ _id: input.commentRefId, targetKey: 'articleComments', modifier: 1 },
							session,
						);
						break;
					case CommentGroup.MEMBER:
						await this.memberService.memberStatsEditor(
							{ _id: input.commentRefId, targetKey: 'memberComments', modifier: 1 },
							session,
						);
						break;
				}
			});
		} catch (err) {
			this.logger.error(`createComment: ${err.message}`, err.stack);
			throw new BadRequestException(Message.CREATE_FAILED);
		} finally {
			await session.endSession();
		}
		return result!;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const { _id, ...updateData } = input;

		const result = await this.commentModel
			.findOneAndUpdate({ _id, memberId, commentStatus: CommentStatus.ACTIVE }, updateData, {
				new: true,
			})
			.exec();
		if (!result) throw new NotFoundException(Message.UPDATE_FAILED);
		return result;
	}

	public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
		const { commentRefId } = input.search;
		const match: FilterQuery<Comment> = { commentRefId: commentRefId, commentStatus: CommentStatus.ACTIVE };
		const sort: Record<string, Direction> = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const result = await this.commentModel
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

	public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
		const result = await this.commentModel.findByIdAndDelete(input).exec();
		if (!result) throw new NotFoundException(Message.REMOVE_FAILED);
		return result;
	}

	public async commentStatsEditor(input: StatisticModifier<Comment>): Promise<Comment | null> {
		const { _id, targetKey, modifier } = input;
		const inc: Record<string, number> = {};
		inc[targetKey] = modifier;
		const updated = await this.commentModel
			.findByIdAndUpdate(_id, { $inc: inc }, { new: true })
			.lean()
			.exec();

		return updated as Comment | null;
	}
}
