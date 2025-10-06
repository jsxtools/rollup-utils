import { importedByChangedFile } from "./file-imported-by-changed-file.js"

export const exportedFromChangedFile = importedByChangedFile

const constToChange = 0

console.log("const to change (from file importing changed file):", constToChange)
