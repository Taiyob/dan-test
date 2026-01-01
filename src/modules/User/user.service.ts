// src/modules/User/user.service.ts
import { PrismaClient, User } from '@prisma/client';
import { BaseService } from '@/core/BaseService';
import { AppLogger } from '@/core/logging/logger';
import { ConflictError, NotFoundError } from '@/core/errors/AppError';
import { CreateUserInput, UpdateUserInput, UserListQuery } from './user.validation';
import { PaginationResult } from '@/types/types';

export interface UserFilters {
    search?: string;
    email?: string;
}

export class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
    constructor(prisma: PrismaClient) {
        super(prisma, 'User', {
            enableSoftDelete: false,
            enableAuditFields: true,
            defaultPageSize: 10,
            maxPageSize: 1000,
        });
    }

    protected getModel() {
        return this.prisma.user;
    }

    /**
     * Get all users with optional filtering and pagination
     */
    
    async getUsers(query: UserListQuery): Promise<PaginationResult<User>> {
        const { page, limit, search, email, sortBy = 'createdAt', sortOrder = 'desc' } = query;

        // Build filters
        const filters: any = {};

        if (search) {
            filters.OR = [
                { displayName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (email) {
            filters.email = { contains: email, mode: 'insensitive' };
        }

        const result = await this.findMany(
            filters,
            { page, limit, offset: (page - 1) * limit },
            { [sortBy]: sortOrder },
            {},
            { password: true }
        );

        AppLogger.info('Users retrieved successfully', {
            filters,
            pagination: { page, limit },
            totalCount: result.total,
        });

        return result;
    }

    /**
     * Get a single user by ID
     */
    async getUserById(id: string): Promise<User> {
        const user = await this.findById(id, {}, { password: true });

        if (!user) {
            throw new NotFoundError('User');
        }

        AppLogger.info(`User retrieved successfully`, { userId: id });
        return user as User;
    }

    /**
     * Get a user by email
     */
    async getUserByEmail(email: string): Promise<User | null> {
        const user = await this.findOne({ email }, {}, { password: true });

        if (user) {
            AppLogger.info(`User found by email`, { email });
        }

        return user as User | null;
    }

    /**
     * Create a new user
     */
    // async createUser(data: CreateUserInput): Promise<User> {
    //     // Check if user already exists
    //     const existingUser = await this.getUserByEmail(data.email);
    //     if (existingUser) {
    //         throw new ConflictError('User with this email already exists');
    //     }

    //     // Use transaction to create user with profile if provided
    //     const user = await this.transaction(async tx => {
    //         // Create user
    //         const newUser = await tx.user.create({
    //             data: {
    //                 email: data.email,
    //                 name: data.name,
    //                 password: data.password,
    //                 role: data.role,
    //             },
    //             include,
    //         });

    //         // Create profile if provided
    //         if (data.profile) {
    //             await tx.profile.create({
    //                 data: {
    //                     userId: newUser.id,
    //                     bio: data.profile.bio,
    //                 },
    //             });

    //             // Fetch user with profile
    //             return tx.user.findUnique({
    //                 where: { id: newUser.id },
    //                 include,
    //             });
    //         }

    //         return newUser;
    //     });

    //     AppLogger.info('User created successfully', {
    //         userId: user!.id,
    //         email: data.email,
    //     });

    //     return user as User;
    // }

    /**
     * Update a user
     */
    async updateUser(id: string, data: UpdateUserInput): Promise<User> {
        // Check if user exists
        await this.getUserById(id);

        // Check email uniqueness if email is being updated
        if (data.email) {
            const existingUser = await this.getUserByEmail(data.email);
            if (existingUser) {
                throw new ConflictError('Another user with this email already exists');
            }
        }

        const updatedUser = await this.updateById(id, data);

        AppLogger.info('User updated successfully', {
            userId: id,
            updatedFields: Object.keys(data),
        });

        return updatedUser as User;
    }

    async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
        const user = await this.findById(userId);

        if (!user) {
            throw new NotFoundError('User');
        }

        const updatedUser = await this.updateById(userId, {
            avatarUrl: avatarUrl
        });

        AppLogger.info('User avatar updated successfully in database', { userId });
        
        return updatedUser as User;
    }

    /**
     * Delete a user
     */
    async deleteUser(id: string): Promise<void> {
        // Check if user exists
        await this.getUserById(id);

        // Use transaction to delete user and related data
        await this.transaction(async tx => {
            // Delete user
            await tx.user.delete({
                where: { id },
            });
        });

        AppLogger.info('User deleted successfully', { userId: id });
    }

    /**
     * Check if user exists
     */
    async userExists(id: string): Promise<boolean> {
        return await this.exists({ id });
    }

    /**
     * Get user statistics
     */
    async getUserStats(id: string) {
        const user = await this.getUserById(id);

        return {
            user,
            stats: {
                joinedAt: user.createdAt,
            },
        };
    }

    /**
     * Search users by name or email
     */
    async searchUsers(searchTerm: string, limit: number = 10): Promise<PaginationResult<User>> {
        const users = await this.findMany(
            {
                OR: [
                    { displayName: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            { page: 1, limit, offset: 0 },
            { createdAt: 'desc' },
            {}
        );
        AppLogger.info('Users searched successfully', {
            searchTerm,
        });

        return users;
    }

    async count() {
        return await this.getModel().count();
    }
}
