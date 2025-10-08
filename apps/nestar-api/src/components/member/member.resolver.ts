import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { ObjectId } from 'mongoose';
import { getSerialForImage, shapeIntoMongoObjectId, validMimeTypes } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Message } from '../../libs/enums/common.enum';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import * as path from 'path';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) {}

    @Mutation(() => Member)
	 	public async signup(@Args('input') input: MemberInput): Promise<Member> {
        console.log('Mutation: signup');
        console.log('MemberInput', input);
        return await this.memberService.signup(input);
    }

    @Mutation(() => Member)
    public async login(@Args('input') input: LoginInput): Promise<Member> {
    console.log('Mutation: login');
		return await this.memberService.login(input)
    }

    @UseGuards(AuthGuard)
	  @Query(() => String)
	  public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
		console.log('Query: checkAuth');
		console.log('memberNick', memberNick)
		return `Hi ${memberNick}`;
	}
    // Authorization: Authenticated Member with specific roles
    @Roles(MemberType.USER, MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Query(() => String)
    public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
		console.log('Query: checkAuthRoles');
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType} and your memberId is ${authMember._id}`;
	}

    // Authenticated only
    @UseGuards(AuthGuard)
    @Mutation(() => Member)
    public async updateMember(@Args('input') input: MemberUpdate, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Mutation: updateMember');
		delete input._id
		return await this.memberService.updateMember(memberId, input);
	}

    @UseGuards(WithoutGuard)
    @Query(() => Member)
        public async getMember(@Args('memberId') input: string, memberId: ObjectId): Promise<Member> {
            console.log("Query: getMember")
            const targetId = shapeIntoMongoObjectId(input);
            return await this.memberService.getMember(memberId, targetId);
        }

    @UseGuards(WithoutGuard)
    @Query(() => Members)
    public async getAgents(@Args('input') input: AgentsInquiry, memberId: ObjectId): Promise<Members> {
    console.log('Query: getAgents');
    return await this.memberService.getAgents(memberId, input);
	}

  @UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: likeTargetMember');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(memberId, likeRefId);
	}

    /** ADMIN **/

  	// Authorization: ADMIN

      @Roles(MemberType.ADMIN)
      @UseGuards(RolesGuard)
      @Mutation(() => Member)
      public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
        console.log('Mutation: updateMemberByAdmin');
        return await this.memberService.updateMemberByAdmin(input);
      }

      // Authorization: ADMIN
      @Roles(MemberType.ADMIN)
      @UseGuards(RolesGuard)
      @Query(() => Members)
      public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Member> {
        console.log('Mutation: getAllMembersByAdmin');
        return await this.memberService.getAllMembersByAdmin(input);
      }
      /** UPLOADER **/

    @UseGuards(AuthGuard)
    @Mutation((returns) => String)
    public async imageUploader(
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload,
    @Args('target') target: string,
    ): Promise<string> {
    console.log('Mutation: imageUploader');
    console.log('Upload details:', { filename, mimetype, target });

    if (!filename) throw new BadRequestException(Message.UPLOAD_FAILED);
    const validMime = validMimeTypes.includes(mimetype);
    if (!validMime) throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);

    const imageName = getSerialForImage(filename);
    const uploadDir = `uploads/${target}`;
    const url = `${uploadDir}/${imageName}`;

    // Create directory if it doesn't exist
    try {
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
      }
    } catch (dirError) {
      console.error('Error creating directory:', dirError);
      throw new BadRequestException(Message.UPLOAD_FAILED);
    }

    const stream = createReadStream();

    const result = await new Promise((resolve, reject) => {
      stream
        .pipe(createWriteStream(url))
        .on('finish', async () => {
          console.log('File uploaded successfully:', url);
          resolve(true);
        })
        .on('error', (error) => {
          console.error('Upload stream error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        });
    }).catch((error) => {
      console.error('Upload promise error:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    });

    if (!result) throw new BadRequestException(Message.UPLOAD_FAILED);

    return url;
    }

    @UseGuards(AuthGuard)
    @Mutation((returns) => [String])
    public async imagesUploader(
      @Args('files', { type: () => [GraphQLUpload] }) files: Promise<FileUpload>[],
      @Args('target') target: string,
      ): Promise<string[]> {
      console.log('Mutation: imagesUploader');
      console.log('Files count:', files?.length || 0);

      if (!files || files.length === 0) {
        throw new BadRequestException('At least one file is required');
      }

      if (files.length > 10) {
        throw new BadRequestException('Maximum 10 files allowed');
      }

      const uploadedImages: string[] = [];
      const uploadDir = `uploads/${target}`;

      // Create directory if it doesn't exist
      try {
        if (!existsSync(uploadDir)) {
          mkdirSync(uploadDir, { recursive: true });
          console.log('Created upload directory:', uploadDir);
        }
      } catch (dirError) {
        console.error('Error creating directory:', dirError);
        throw new BadRequestException(Message.UPLOAD_FAILED);
      }

      const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<void> => {

        try {
           const { filename, mimetype, encoding, createReadStream } = await img;
           console.log(`Uploading file ${index + 1}:`, { filename, mimetype });

           const validMime = validMimeTypes.includes(mimetype);
          if (!validMime) throw new BadRequestException (Message.PROVIDE_ALLOWED_FORMAT);

          const imageName = getSerialForImage(filename);
          const url = `${uploadDir}/${imageName}`;
          const stream = createReadStream();

          const result = await new Promise((resolve, reject) => {
            stream
              .pipe(createWriteStream(url))
              .on('finish', () => {
                console.log(`File ${index + 1} uploaded successfully:`, url);
                resolve(true);
              })
              .on('error', (error) => {
                console.error(`Upload error for file ${index + 1}:`, error);
                reject(new Error(`Upload failed: ${error.message}`));
              });
          }).catch((error) => {
            console.error(`Upload promise error for file ${index + 1}:`, error);
            throw error;
          });

          if (!result) throw new BadRequestException (Message.UPLOAD_FAILED);

          uploadedImages[index] = url;
        } catch (err) {
          console.error(`Error uploading file ${index + 1}:`, err);
          throw new BadRequestException(`File ${index + 1} upload failed: ${err.message}`);
        }
      });

        await Promise.all(promisedList);

        console.log('All files uploaded successfully:', uploadedImages.length);
        return uploadedImages;
}

}

