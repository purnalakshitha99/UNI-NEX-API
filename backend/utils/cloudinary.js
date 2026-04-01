// utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = async (filePath, folder = "general") => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { quality: "auto" },
        { fetch_format: "auto" }
      ]
    });

    // Delete local file after upload
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.error("Failed to delete local file:", unlinkError);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>}
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("Public ID is required");
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== "ok") {
      throw new Error(`Failed to delete: ${result.result}`);
    }
    
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

/**
 * Get optimized URL for image
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string}
 */
export const getOptimizedUrl = (publicId, options = {}) => {
  const { width, height, crop = "limit", quality = "auto" } = options;
  
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality }
    ]
  });
};

export default cloudinary;