import { withTransaction } from "../../utils/dbTransaction.js";
import * as PaymentService from "./payment.service.js";

export const createPayment = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.createPaymentService(client, req.body, req.user.id);
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.getPaymentsService(client, req.query);
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.getPaymentByIdService(client, req.params.id);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.updatePaymentService(
        client,
        req.params.id,
        req.body,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.deletePaymentService(
        client,
        req.params.id,
        req.user.id,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getPaymentSummary = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.getPaymentSummaryService(client, req.query);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getPersonnelPaymentSummary = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.getPersonnelPaymentSummaryService(
        client,
        req.query,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const generateSalary = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.generateStaffSalaryService(client, req.query);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const generateContractorPayout = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return PaymentService.generateContractorPayoutService(client, req.query);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
