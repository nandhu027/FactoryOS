import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as PartyService from "./parties.service.js";
import * as Validation from "./parties.validation.js";

export const createParty = asyncHandler(async (req, res) => {
  const validData = Validation.validatePartyPayload(req.body);
  const result = await withTransaction((client) =>
    PartyService.createPartyService(client, validData),
  );
  res.status(201).json({ success: true, data: result });
});

export const getParties = asyncHandler(async (req, res) => {
  const validQuery = Validation.validatePartyQuery(req.query);
  const result = await withTransaction((client) =>
    PartyService.getPartiesService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getPartyById = asyncHandler(async (req, res) => {
  const validFilters = Validation.validateDrillDownQuery(req.query);
  const result = await withTransaction((client) =>
    PartyService.getPartyByIdService(client, req.params.id, validFilters),
  );
  res.json({ success: true, data: result });
});

export const updateParty = asyncHandler(async (req, res) => {
  const validData = Validation.validatePartyUpdate(req.body);
  const result = await withTransaction((client) =>
    PartyService.updatePartyService(client, req.params.id, validData),
  );
  res.json({
    success: true,
    message: "Party successfully updated.",
    data: result,
  });
});

export const deleteParty = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    PartyService.deletePartyService(client, req.params.id),
  );
  res.json({ success: true, ...result });
});
