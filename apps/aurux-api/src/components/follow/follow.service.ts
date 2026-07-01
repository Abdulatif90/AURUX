import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ObjectId } from 'bson';
import { MemberService } from '../member/member.service';
import { Follower,Followers, Following, Followings } from '../../libs/dto/follow/follow';
import { Direction, Message } from '../../libs/enums/common.enum';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';
import { lookupAuthMemberFollowed,
         lookupAuthMemberLiked,
         lookupFollowingData,
        lookupFollowerData } from '../../libs/config';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

 constructor(
    @InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
    private memberService: MemberService,
  ) {}

  // subscribe
  public async subscribe(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
    if (followerId.toString() === followingId.toString()) {
      throw new BadRequestException(Message.SELF_SUBSCRIPTION_DENIED);
    }
    await this.memberService.getMember(null, followingId);

    const session: ClientSession = await this.followModel.db.startSession();
    let result: Follower;
    try {
      await session.withTransaction(async () => {
        result = await this.registerSubscription(followerId, followingId, session);
        await this.memberService.memberStatsEditor({ _id: followingId, targetKey: 'memberFollowings', modifier: 1 }, session);
        await this.memberService.memberStatsEditor({ _id: followerId, targetKey: 'memberFollowers', modifier: 1 }, session);
      });
    } catch (err) {
      this.logger.error(`subscribe: ${err.message}`, err.stack);
      throw new BadRequestException(Message.CREATE_FAILED);
    } finally {
      await session.endSession();
    }
    return result!;
  }

  // registerSubscription
  private async registerSubscription(followerId: ObjectId, followingId: ObjectId, session?: ClientSession): Promise<Follower> {
    try {
      const docs = await this.followModel.create([{ followingId, followerId }], { session });
      return docs[0];
    } catch (err) {
      this.logger.error(`registerSubscription: ${err.message}`, err.stack);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  // unsubscribe
  public async unsubscribe(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
    await this.memberService.getMember(null, followingId);

    const session: ClientSession = await this.followModel.db.startSession();
    let result: Follower | undefined;
    try {
      await session.withTransaction(async () => {
        const deleted = await this.followModel
          .findOneAndDelete({ followingId, followerId }, { session })
          .exec();
        if (!deleted) throw new NotFoundException(Message.NO_DATA_FOUND);
        result = deleted;

        await this.memberService.memberStatsEditor({ _id: followingId, targetKey: 'memberFollowings', modifier: -1 }, session);
        await this.memberService.memberStatsEditor({ _id: followerId, targetKey: 'memberFollowers', modifier: -1 }, session);
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`unsubscribe: ${err.message}`, err.stack);
      throw new BadRequestException(Message.SOMETHING_WENT_WRONG);
    } finally {
      await session.endSession();
    }
    return result!;
  }

    // getMemberFollowings

    public async getMemberFollowings(memberId: ObjectId, input: FollowInquiry): Promise<Followings> {
    const { page, limit, search } = input;
    if (!search?.followerId) throw new BadRequestException(Message.BAD_REQUEST);
    const match: FilterQuery<Follower> = { followerId: search.followerId };

    const result = await this.followModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: Direction.DESC } },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$followingId'),
              lookupAuthMemberFollowed(memberId, '$followingId'),
              lookupFollowingData,
              { $unwind: { path: '$followingData' } },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    return result[0];
  }

  // getMemberFollowers
  public async getMemberFollowers(memberId: ObjectId, input: FollowInquiry): Promise<Followers> {
    const { page, limit, search } = input;
    if (!search?.followingId) throw new BadRequestException(Message.BAD_REQUEST);
    const match: FilterQuery<Following> = { followingId: search.followingId };

    const result = await this.followModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: Direction.DESC } },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$followerId'),
              lookupAuthMemberFollowed(memberId, '$followerId'),
              lookupFollowerData,
              { $unwind: { path: '$followerData' } },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    return result[0];
  }
}
