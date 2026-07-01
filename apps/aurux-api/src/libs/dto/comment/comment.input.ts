import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsMongoId, IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { ObjectId } from 'bson';
import { CommentGroup } from '../../enums/comment.enum';
import { Direction } from '../../enums/common.enum';
import { availableCommentSorts } from '../../config';

@InputType()
export class CommentInput {
	@IsNotEmpty()
	@Field(() => CommentGroup)
	commentGroup: CommentGroup;

	@IsNotEmpty()
	@Length(1, 100)
	@Field(() => String)
	commentContent: string;

	@IsNotEmpty()
	@IsMongoId()
	@Field(() => String)
	commentRefId: ObjectId;

	memberId?: ObjectId;
}

@InputType()
class CISearch {
	@IsNotEmpty()
	@IsMongoId()
	@Field(() => String)
	commentRefId: ObjectId;
}

@InputType()
export class CommentsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Max(100)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableCommentSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => CISearch)
	search: CISearch;
}

