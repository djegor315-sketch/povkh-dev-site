import homeHtml from "../templates/home-ru.html?raw";

const bodyMatch = homeHtml.match(/<body>([\s\S]*?)<script>/);
const scriptMatch = homeHtml.match(/<script>([\s\S]*?)<\/script>/);

if (!bodyMatch || !scriptMatch) {
  throw new Error("The approved Russian homepage visual lock is incomplete");
}

export const editorialBody = bodyMatch[1];
export const editorialScriptSource = scriptMatch[1];
