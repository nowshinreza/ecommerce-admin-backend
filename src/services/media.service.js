import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import prisma from "../prisma.js";

const uploadsFolder = path.resolve("uploads");
const thumbnailsFolder = path.resolve("uploads/thumbnails");

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
];

async function ensureUploadFolders() {
  await fs.mkdir(uploadsFolder, {
    recursive: true,
  });

  await fs.mkdir(thumbnailsFolder, {
    recursive: true,
  });
}

function getMediaType(mimeType) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

async function saveSingleFile(file, userId) {
  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
    const error = new Error("Invalid or unsupported file content");
    error.statusCode = 400;
    throw error;
  }

  await ensureUploadFolders();

  const uniqueName = `${crypto.randomUUID()}.${detectedType.ext}`;
  const filePath = path.join(uploadsFolder, uniqueName);

  await fs.writeFile(filePath, file.buffer);

  let width = null;
  let height = null;
  let thumbnailUrl = null;

  if (detectedType.mime.startsWith("image/")) {
    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    width = metadata.width || null;
    height = metadata.height || null;

    const thumbnailName = `thumb-${uniqueName}.webp`;
    const thumbnailPath = path.join(
      thumbnailsFolder,
      thumbnailName,
    );

    await image
      .resize({
        width: 300,
        height: 300,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
      })
      .toFile(thumbnailPath);

    thumbnailUrl = `/uploads/thumbnails/${thumbnailName}`;
  }

  return prisma.media.create({
    data: {
      fileName: uniqueName,
      originalName: file.originalname,
      storedPath: filePath,
      publicUrl: `/uploads/${uniqueName}`,
      mimeType: detectedType.mime,
      type: getMediaType(detectedType.mime),
      size: file.size,
      width,
      height,
      thumbnail: thumbnailUrl,
      uploadedById: userId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function uploadMediaFiles(files, userId) {
  if (!files || files.length === 0) {
    const error = new Error("At least one file is required");
    error.statusCode = 400;
    throw error;
  }

  const savedFiles = [];

  for (const file of files) {
    try {
      const savedFile = await saveSingleFile(file, userId);
      savedFiles.push(savedFile);
    } catch (error) {
      for (const savedFile of savedFiles) {
        try {
          await fs.unlink(savedFile.storedPath);

          if (savedFile.thumbnail) {
            const thumbnailPath = path.resolve(
              savedFile.thumbnail.replace(/^\//, ""),
            );

            await fs.unlink(thumbnailPath);
          }

          await prisma.media.delete({
            where: {
              id: savedFile.id,
            },
          });
        } catch {
          // Ignore cleanup errors.
        }
      }

      throw error;
    }
  }

  return savedFiles;
}

export async function getMediaList(query) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where = {
    ...(query.search
      ? {
          OR: [
            {
              originalName: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              altText: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),

    ...(query.type
      ? {
          type: query.type,
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.media.count({
      where,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getMediaById(id) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  return media;
}

export async function updateMedia(id, data) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.media.update({
    where: {
      id,
    },
    data: {
      ...(data.title !== undefined && {
        title: data.title,
      }),

      ...(data.altText !== undefined && {
        altText: data.altText,
      }),
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function deleteMedia(id) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  try {
    await fs.unlink(media.storedPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (media.thumbnail) {
    const thumbnailPath = path.resolve(
      media.thumbnail.replace(/^\//, ""),
    );

    try {
      await fs.unlink(thumbnailPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  await prisma.media.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}