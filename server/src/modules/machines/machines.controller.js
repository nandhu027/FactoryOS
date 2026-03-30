import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as MachineService from "./machines.service.js";
import * as Validation from "./machines.validation.js";

export const createMachine = asyncHandler(async (req, res) => {
  const validData = Validation.validateMachinePayload(req.body);
  const result = await withTransaction((client) =>
    MachineService.createMachineService(client, validData),
  );
  res.status(201).json({
    success: true,
    message: "Machine successfully deployed.",
    data: result,
  });
});

export const getMachines = asyncHandler(async (req, res) => {
  const validQuery = Validation.validateMachineQuery(req.query);
  const result = await withTransaction((client) =>
    MachineService.getMachinesService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getMachineById = asyncHandler(async (req, res) => {
  const validFilters = Validation.validateDrillDownQuery(req.query);
  const result = await withTransaction((client) =>
    MachineService.getMachineByIdService(client, req.params.id, validFilters),
  );
  res.json({ success: true, data: result });
});

export const updateMachine = asyncHandler(async (req, res) => {
  const validData = Validation.validateMachineUpdate(req.body);
  const result = await withTransaction((client) =>
    MachineService.updateMachineService(client, req.params.id, validData),
  );
  res.json({
    success: true,
    message: "Machine settings updated.",
    data: result,
  });
});

export const deleteMachine = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    MachineService.deleteMachineService(client, req.params.id),
  );
  res.json({ success: true, ...result });
});
