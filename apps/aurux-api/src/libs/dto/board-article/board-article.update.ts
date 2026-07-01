import { Field, InputType } from '@nestjs/graphql';
import { IsMongoId, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { BoardArticleStatus } from '../../enums/board-article.enum';
import { ObjectId } from 'bson';

@InputType()
export class BoardArticleUpdate {
	@IsNotEmpty()
	@IsMongoId()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => BoardArticleStatus, { nullable: true })
	articleStatus?: BoardArticleStatus;

	@IsOptional()
	@Length(3, 50)
	@Field(() => String, { nullable: true })
	articleTitle?: string;

	@IsOptional()
	@Length(3, 250)
	@Field(() => String, { nullable: true })
	articleContent?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	articleImage?: string;
}
