import {
  addAttributeValue,
  createAttribute,
  deleteAttribute,
  deleteAttributeValue,
  getAttributeById,
  getAttributes,
  updateAttribute,
  updateAttributeValue,
} from "../services/attribute.service.js";
import { attributeQuerySchema } from "../validators/attribute.validator.js";

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
    const attribute = await createAttribute(req.body);

    return res.status(201).json({
      success: true,
      message: "Attribute created successfully",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const queryResult = attributeQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const result = await getAttributes(queryResult.data);

    return res.status(200).json({
      success: true,
      message: "Attributes retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "attribute");
    const attribute = await getAttributeById(id);

    return res.status(200).json({
      success: true,
      message: "Attribute retrieved successfully",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "attribute");
    const attribute = await updateAttribute(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Attribute updated successfully",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id, "attribute");
    const result = await deleteAttribute(id);

    return res.status(200).json({
      success: true,
      message: "Attribute deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createValue(req, res, next) {
  try {
    const attributeId = parsePositiveId(
      req.params.attributeId,
      "attribute",
    );

    const value = await addAttributeValue(attributeId, req.body);

    return res.status(201).json({
      success: true,
      message: "Attribute value created successfully",
      data: value,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateValue(req, res, next) {
  try {
    const attributeId = parsePositiveId(
      req.params.attributeId,
      "attribute",
    );

    const valueId = parsePositiveId(
      req.params.valueId,
      "attribute value",
    );

    const value = await updateAttributeValue(
      attributeId,
      valueId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Attribute value updated successfully",
      data: value,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeValue(req, res, next) {
  try {
    const attributeId = parsePositiveId(
      req.params.attributeId,
      "attribute",
    );

    const valueId = parsePositiveId(
      req.params.valueId,
      "attribute value",
    );

    const result = await deleteAttributeValue(
      attributeId,
      valueId,
    );

    return res.status(200).json({
      success: true,
      message: "Attribute value deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}