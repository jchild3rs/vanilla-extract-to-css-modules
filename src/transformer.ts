import type { API, FileInfo } from "jscodeshift";

const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;

function kebabCase(str: string) {
  return str.replace(KEBAB_REGEX, function (match) {
    return "-" + match.toLowerCase();
  });
}

export function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;

  const root = j(file.source);
  const cssDeclarationTemplates: string[] = [];

  root.findVariableDeclarators().forEach((path) => {
    const cssClassName = path.getValueProperty("id").name;
    const cssPropertyDefinitions = new Map();

    j(path)
      .find(j.ObjectExpression)
      .forEach((objectExpression) => {
        j(objectExpression)
          .find(j.ObjectProperty)
          .forEach((objectProperty) => {
            cssPropertyDefinitions.set(
              kebabCase(objectProperty.get("key").value.name),
              objectProperty.get("value").value.value
            );
          });
      });

    const cssDeclarationTemplate = `.${cssClassName} {
  ${[...cssPropertyDefinitions.entries()]
    .map(([prop, val]) => `${prop}: ${val};`)
    .join("\n  ")
    .trim()}
}`;
    cssDeclarationTemplates.push(cssDeclarationTemplate);
  });

  return cssDeclarationTemplates.join("\n\n") + "\n";
}

export const parser = "tsx";
