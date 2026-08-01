import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "../services/product.service.js";
import { productQuerySchema } from "../validators/product.validator.js";

function parsePositiveId(value, label) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`Invalid ${label} ID`);
    error.statusCode = 400;
    throw error;
  }

  return id;
}

export async function create(req, res, next) {
  try {
    const product = await createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const queryResult = productQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const result = await getProducts(queryResult.data);

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "product");

    const product = await getProductById(id);

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "product");

    const product = await updateProduct(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "product");

    const result = await deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}