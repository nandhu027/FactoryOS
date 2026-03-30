import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as ProductService from "./products.service.js";
import * as Validation from "./products.validation.js";

export const createProduct = asyncHandler(async (req, res) => {
  const validData = Validation.validateProductPayload(req.body);
  const result = await withTransaction((client) =>
    ProductService.createProductService(client, validData),
  );
  res
    .status(201)
    .json({ success: true, message: "Product created.", data: result });
});

export const getProducts = asyncHandler(async (req, res) => {
  const validQuery = Validation.validateCatalogQuery(req.query);
  const result = await withTransaction((client) =>
    ProductService.getProductsService(client, validQuery),
  );
  res.json({ success: true, data: result });
});

export const getProductById = asyncHandler(async (req, res) => {
  const validFilters = Validation.validateDrillDownQuery(req.query);
  const result = await withTransaction((client) =>
    ProductService.getProductByIdService(client, req.params.id, validFilters),
  );
  res.json({ success: true, data: result });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const validData = Validation.validateProductUpdate(req.body);
  const result = await withTransaction((client) =>
    ProductService.updateProductService(client, req.params.id, validData),
  );
  res.json({ success: true, message: "Product updated.", data: result });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    ProductService.deleteProductService(client, req.params.id),
  );
  res.json({ success: true, ...result });
});

export const createSemiFinished = asyncHandler(async (req, res) => {
  const validData = Validation.validateSemiFinishedPayload(req.body);
  const result = await withTransaction((client) =>
    ProductService.createSemiFinishedService(client, validData),
  );
  res
    .status(201)
    .json({ success: true, message: "WIP Item created.", data: result });
});

export const getSemiFinished = asyncHandler(async (req, res) => {
  const validQuery = Validation.validateCatalogQuery(req.query);
  const result = await withTransaction((client) =>
    ProductService.getSemiFinishedService(client, validQuery),
  );
  res.json({ success: true, data: result });
});

export const getSemiFinishedById = asyncHandler(async (req, res) => {
  const validFilters = Validation.validateDrillDownQuery(req.query);
  const result = await withTransaction((client) =>
    ProductService.getSemiFinishedByIdService(
      client,
      req.params.id,
      validFilters,
    ),
  );
  res.json({ success: true, data: result });
});

export const updateSemiFinished = asyncHandler(async (req, res) => {
  const validData = Validation.validateSemiFinishedUpdate(req.body);
  const result = await withTransaction((client) =>
    ProductService.updateSemiFinishedService(client, req.params.id, validData),
  );
  res.json({ success: true, message: "WIP Item updated.", data: result });
});

export const deleteSemiFinished = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    ProductService.deleteSemiFinishedService(client, req.params.id),
  );
  res.json({ success: true, ...result });
});
