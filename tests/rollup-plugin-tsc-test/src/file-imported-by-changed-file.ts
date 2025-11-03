export const importedByChangedFile = "I was imported by a changed file!"

const constToChange = 0

console.log("const to change (from file imported by changed file):", constToChange)

// @ts-expect-error
if (constToChange === "flowers") {
	console.log("this can never happen")
}
