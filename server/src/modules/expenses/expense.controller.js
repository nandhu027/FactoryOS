import { withTransaction } from "../../utils/dbTransaction.js";
import * as ExpenseService from "./expense.service.js";

export const createExpenseCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.createExpenseCategoryService(
        client,
        req.body,
        req.user.id,
      );
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getExpenseCategories = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpenseCategoriesService(client, req.query);
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getExpenseCategoryById = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpenseCategoryByIdService(
        client,
        req.params.id,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateExpenseCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.updateExpenseCategoryService(
        client,
        req.params.id,
        req.body,
        req.user.id,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteExpenseCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.deleteExpenseCategoryService(
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

export const createExpense = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.createExpenseService(client, req.body, req.user.id);
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpensesService(client, req.query);
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpenseByIdService(client, req.params.id);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.updateExpenseService(
        client,
        req.params.id,
        req.body,
        req.user.id,
      );
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.deleteExpenseService(
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

export const getExpenseSummary = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpenseSummaryService(client, req.query);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getExpenseCategorySummary = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      return ExpenseService.getExpenseCategorySummaryService(client, req.query);
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
