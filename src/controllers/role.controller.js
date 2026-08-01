import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../services/role.service.js";
import { roleQuerySchema } from "../validators/role.validator.js";

export async function create(req, res, next) {
  try {
    const role = await createRole(req.body);

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const queryResult = roleQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const result = await getRoles(queryResult.data);

    return res.status(200).json({
      success: true,
      message: "Roles retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await getRoleById(id);

    return res.status(200).json({
      success: true,
      message: "Role retrieved successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await updateRole(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const result = await deleteRole(id);

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}