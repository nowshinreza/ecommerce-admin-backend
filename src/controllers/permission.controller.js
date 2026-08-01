import {
  createPermissionGroup,
  deletePermissionGroup,
  getPermissionGroupById,
  getPermissionGroups,
  updatePermissionGroup,
} from "../services/permission.service.js";
import { permissionQuerySchema } from "../validators/permission.validator.js";

export async function createGroup(req, res, next) {
  try {
    const group = await createPermissionGroup(req.body);

    return res.status(201).json({
      success: true,
      message: "Permission group created successfully",
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function listGroups(req, res, next) {
  try {
    const queryResult = permissionQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const result = await getPermissionGroups(queryResult.data);

    return res.status(200).json({
      success: true,
      message: "Permission groups retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroup(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission group ID",
      });
    }

    const group = await getPermissionGroupById(id);

    return res.status(200).json({
      success: true,
      message: "Permission group retrieved successfully",
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGroup(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission group ID",
      });
    }

    const group = await updatePermissionGroup(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Permission group updated successfully",
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission group ID",
      });
    }

    const result = await deletePermissionGroup(id);

    return res.status(200).json({
      success: true,
      message: "Permission group deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}