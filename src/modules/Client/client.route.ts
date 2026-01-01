// fileName: client.route.ts

import { Request, Response, Router } from "express";
import { ClientController } from "./client.controller";
import { asyncHandler } from "@/middleware/asyncHandler";
import { validateRequest } from "@/middleware/validation";
import { ClientValidation } from "./client.validation";
import { authenticate } from "@/middleware/auth";

export class ClientRoutes {
  private router: Router;
  private clientsController: ClientController;

  constructor(clientsController: ClientController) {
    this.router = Router();
    this.clientsController = clientsController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Protected routes (authentication required)

    //  Create a single new client
    this.router.post(
      "/",
      validateRequest({
        body: ClientValidation.body.addClient,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.clientsController.createClient(req, res)
      )
    );
    
    // Create multiple clients (Batch/CSV upload)
    this.router.post(
        "/import-csv", 
        validateRequest({
            body: ClientValidation.body.addMultipleClients, 
        }),
        asyncHandler((req: Request, res: Response) =>
            this.clientsController.createMultipleClients(req, res)
        )
    );


    // get All Clients
    this.router.get(
      "/",
      validateRequest({
        query: ClientValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.clientsController.getAllClients(req, res)
      )
    );

    this.router.get(
      "/my",
      authenticate,
      validateRequest({
        query: ClientValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.clientsController.getMyClients(req, res)
      )
    );

    // Get client by ID
    this.router.get(
      "/:id",
      validateRequest({
        params: ClientValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.clientsController.getClientById(req, res)
      )
    );

    // Update client by ID
    this.router.patch(
      "/:id",
      validateRequest({
        params: ClientValidation.params.id,
        body: ClientValidation.body.updateClient,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.clientsController.updateClient(req, res)
      )
    );

    //delete client by ID
    this.router.delete(
        "/:id",
        validateRequest({
          params: ClientValidation.params.id,
        }),
        asyncHandler((req: Request, res: Response) =>
          this.clientsController.deleteClient(req, res)
        )
    )
  }


  public getRouter(): Router {
    return this.router;
  }
}