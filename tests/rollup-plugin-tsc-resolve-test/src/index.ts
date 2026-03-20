import { Button } from "@components/Button.js";
import { formatError, formatMessage } from "@utils/format.js";

const button = new Button("Click me");

console.log(button.render());
console.log(formatMessage("Application started"));
console.log(formatError("Something went wrong"));

export { Button, formatError, formatMessage };
