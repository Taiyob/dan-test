// fileName: client.service.ts

import { BaseService } from "@/core/BaseService";
import { Client, PrismaClient } from "@prisma/client";
import { AppLogger } from "@/core/logging/logger";
import { AddClientInput, ClientListQuery, AddMultipleClientsInput } from "./client.validation";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";

export class ClientService extends BaseService<Client> {
  private readonly SALT_ROUNDS = 12;

  constructor(prisma: PrismaClient) {
    super(prisma, "Client", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.client;
  } 

  /**
   * Create a new client (SINGLE)
   */
  async createClient(data: AddClientInput): Promise<Client> {
    const { company, name, email, phone, cranes, location, additionalNote, ownerId, status } = data;

    const existingClient = await this.findOne({ email });
    if (existingClient) {
      AppLogger.warn(`Client with email ${email} already exists.`);
      throw new ConflictError("Client with this email already exists");
    }

    AppLogger.info(`Creating new client: ${email} for company: ${company}`);

    const newClient = await this.create({
      company,
      name,
      email,
      phone,
      cranes,
      location,
      additionalNote,
      ownerId,
      status
    });

    AppLogger.info(`New client created: ${newClient.email} (ID: ${newClient.id})`);
    return newClient;
  }

  /**
   * Create multiple clients (BATCH/CSV)
   */
  
  async createMultipleClients(data: AddMultipleClientsInput): Promise<Client[]> {
    const emails = data.map(c => c.email).filter(Boolean) as string[];

    if (emails.length > 0) {
      const existingClients = await this.findMany({ email: { in: emails } });
      if (existingClients.data.length > 0) {
        const existingEmails = existingClients.data.map(c => c.email);
        AppLogger.warn(`Batch creation failed due to existing emails: ${existingEmails.join(", ")}`);
        throw new ConflictError(`One or more clients already exist with emails: ${existingEmails.join(", ")}`);
      }
    }

    AppLogger.info(`Starting batch creation for ${data.length} clients.`);

    const createdResult = await this.prisma.client.createMany({
      data: data.map(c => ({
        company: c.company,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        cranes: c.cranes,
        location: c.location,
        additionalNote: c.additionalNote,
        ownerId: c.ownerId,
        status: c.status
      })),
      skipDuplicates: true,
    });

    AppLogger.info(`Batch creation completed. Count: ${createdResult.count}`);

    // Fetch newly created clients to return full objects
    return createdResult.count > 0
      ? (await this.findMany({ company: { in: data.map(c => c.company) } })).data.slice(0, createdResult.count)
      : [];
  }

  /**
   * Get all clients with optional filtering, search, and pagination
   */
  async getClients(query: ClientListQuery) {
    const { page = 1, limit = 10, search, status, sortBy = "createdAt", sortOrder = "desc", ...rest } = query;

    let filters: any = { ...this.buildWhereClause(rest) };

    if (status) filters.status = status;

    if (search) {
      filters.OR = [
        { company: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const offset = (page - 1) * limit;

    const result = await this.findMany(
      filters,
      { page, limit, offset },
      { [sortBy]: sortOrder },
      {} // include relations if needed
    );

    AppLogger.info(`🎉 Clients found: ${result.data.length}`);
    return result;
  }

  /**
 * Get clients by owner (logged-in user)
 */
async getClientsByOwner(ownerId: string, query: ClientListQuery) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    ...rest
  } = query;

  let filters: any = {
    ownerId, 
    ...this.buildWhereClause(rest),
  };

  if (status) filters.status = status;

  if (search) {
    filters.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const offset = (page - 1) * limit;

  return this.findMany(
    filters,
    { page, limit, offset },
    { [sortBy]: sortOrder },
    {}
  );
}

  /**
   * Get the total count of all clients
   */
  async getTotalClientsCount(includeDeleted: boolean = false): Promise<number> {
    const where: any = {};
    
    if (this.options.enableSoftDelete && !includeDeleted) {
        where.deletedAt = null;
    }

    const count = await this.getModel().count({
      where: where,
    });

    AppLogger.info(`Total clients count (including soft-deleted: ${includeDeleted}): ${count}`);
    return count;
  }

  /**
   * Get a client by ID
   */
  async getClientById(id: string): Promise<Client | null> {
    const client = await this.findById(id);
    if (!client) throw new NotFoundError("Client");
    return client;
  }

  /**
   * Update a client by ID
   */
  async updateClient(id: string, data: Partial<AddClientInput>): Promise<Client> {
    const client = await this.exists({ id });
    if (!client) throw new NotFoundError("Client");

    const updatedClient = await this.updateById(id, data);
    AppLogger.info(`Client updated: ${updatedClient.email} (ID: ${updatedClient.id})`);
    return updatedClient;
  }

  /**
   * Soft delete a client by ID
   */
  async deleteClient(id: string): Promise<Client> {
    const client = await this.exists({ id });
    if (!client) throw new NotFoundError("Client");
    const deletedClient = await this.deleteById(id);
    if(deletedClient){
      await this.prisma.asset.deleteMany({
        where: {
          clientId: id
        }
      });
    }
    AppLogger.info(`Client deleted: ${deletedClient.email} (ID: ${deletedClient.id})`);
    return deletedClient;
  }
}
