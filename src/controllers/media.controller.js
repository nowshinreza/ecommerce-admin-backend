import {
  deleteMedia,
  getMediaById,
  getMediaList,
  updateMedia,
  uploadMediaFiles,
} from "../services/media.service.js";
import { mediaQuerySchema } from "../validators/media.validator.js";

export async function uploadFiles(req, res, next) {
  try {
    const media = await uploadMediaFiles(req.files, req.user.id);

    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      data: media,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const queryResult = mediaQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const result = await getMediaList(queryResult.data);

    return res.status(200).json({
      success: true,
      message: "Media retrieved successfully",
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
        message: "Invalid media ID",
      });
    }

    const media = await getMediaById(id);

    return res.status(200).json({
      success: true,
      message: "Media retrieved successfully",
      data: media,
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
        message: "Invalid media ID",
      });
    }

    const media = await updateMedia(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Media updated successfully",
      data: media,
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
        message: "Invalid media ID",
      });
    }

    const result = await deleteMedia(id);

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}