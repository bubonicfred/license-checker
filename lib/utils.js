const fs = require("fs").promises;
const path = require("path");

// Step 2: Update Functions to Async
/**
 * Asynchronously reads the contents of a file.
 * @param {string} filePath The path to the file.
 * @returns {Promise<string>} The file contents.
 */
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8"); // Use await with fs.promises
  }
  catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    throw error; // Rethrow or handle as needed
  }
}

/**
 * Asynchronously writes content to a file, creating the directory structure if it does not exist.
 * @param {string} filePath The path to the file.
 * @param {string} content The content to write to the file.
 */
async function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true }); // Use await with fs.promises
    await fs.writeFile(filePath, content, "utf8");
  }
  catch (error) {
    console.error(`Error writing file at ${filePath}:`, error);
    throw error;
  }
}

/**
 * Checks if a file exists.
 * @param {string} filePath The path to the file.
 * @returns {boolean} True if the file exists, false otherwise.
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  }
  catch {
    return false;
  }
}

async function mkdir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  }
  catch (error) {
    console.error(`Error making directory at ${dir}:`, error);
    throw error;
  }
}

async function readdir(dir) {
  try {
    await fs.readdir(dir);
  }
  catch (error) {
    console.error(`Error reading directory at ${dir}:`, error);
    throw error;
  }
}

async function lstat(file) {
  await fs.lstat(file);
}

module.exports = { lstat, readdir, mkdir, readFile, writeFile, fileExists };
