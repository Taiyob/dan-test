// src/modules/User/user.controller.ts
import { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { UserService } from './user.service';
import { AppError, NotFoundError } from '@/core/errors/AppError';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { S3Service } from '@/services/S3Service';

export class UserController extends BaseController {
    constructor(private userService: UserService, private s3Service: S3Service) {
        super();
    }

    /**
     * Get all users with optional filtering and pagination
     * GET /api/users
     */
    public getUsers = async (req: Request, res: Response) => {
        // Use validated query if available, fallback to req.query
        const query = req.validatedQuery || req.query;
        this.logAction('getUsers', req, { query });

        const result = await this.userService.getUsers(query);

        // Always return paginated response - no more conditional logic
        return this.sendPaginatedResponse(
            res,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrevious: result.hasPrevious,
            },
            'Users retrieved successfully',
            result.data
        );
    };

    /**
     * Get a single user by ID
     * GET /api/users/:id
     */
    public getUserById = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const { id } = params;
        const userId = id;

        this.logAction('getUserById', req, { userId });

        const user = await this.userService.getUserById(userId);
        return this.sendResponse(res, 'User retrieved successfully', HTTPStatusCode.OK, user);
    };

    /**
     * Update a user
     * PUT /api/users/:id
     */
    public updateUser = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const body = req.validatedBody || req.body;
        const { id } = params;
        const userId = id;

        this.logAction('updateUser', req, { userId, updatedFields: Object.keys(body) });

        const user = await this.userService.updateUser(userId, body);
        return this.sendResponse(res, 'User updated successfully', HTTPStatusCode.OK, user);
    };

    public uploadAvatar = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const { id } = params;

        if (!req.file) {
            throw new Error('No image file provided'); 
        }

        this.logAction('uploadAvatar', req, { userId: id, fileName: req.file.originalname });

        const avatarUrl = await this.s3Service.uploadFile(req.file);

        const user = await this.userService.updateAvatar(id, avatarUrl);

        return this.sendResponse(
            res,
            'Profile picture updated successfully',
            HTTPStatusCode.OK,
            { avatarUrl: user.avatarUrl }
        );
    };

    /**
     * Delete a user
     * DELETE /api/users/:id
     */
    public deleteUser = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const { id } = params;
        const userId = id;

        this.logAction('deleteUser', req, { userId });

        await this.userService.deleteUser(userId);
        return this.sendNoContentResponse(res);
    };

    /**
     * Get user statistics
     * GET /api/users/:id/stats
     */
    public getUserStats = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const { id } = params;
        const userId = id;

        this.logAction('getUserStats', req, { userId });

        const stats = await this.userService.getUserStats(userId);
        return this.sendResponse(
            res,
            'User statistics retrieved successfully',
            HTTPStatusCode.OK,
            stats
        );
    };

    /**
     * Search users
     * GET /api/users/search
     * Now returns consistent paginated response
     */
    public searchUsers = async (req: Request, res: Response) => {
        const query = req.validatedQuery || req.query;
        const { q: searchTerm, search, limit = '10' } = query;

        // Support both 'q' and 'search' parameters
        const finalSearchTerm = searchTerm || search;

        if (!finalSearchTerm || typeof finalSearchTerm !== 'string') {
            throw new NotFoundError('Search term is required');
        }

        this.logAction('searchUsers', req, { searchTerm: finalSearchTerm, limit });

        const result = await this.userService.searchUsers(
            finalSearchTerm,
            parseInt(limit as string)
        );

        // Always return paginated response
        return this.sendPaginatedResponse(
            res,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrevious: result.hasPrevious,
            },
            'Users searched successfully',
            result.data
        );
    };
}
