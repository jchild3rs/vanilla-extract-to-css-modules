import type { API, FileInfo } from "jscodeshift";

const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;

function kebabCase(str: string) {
  return (
    str?.replace(KEBAB_REGEX, function (match) {
      return "-" + match.toLowerCase();
    }) ?? ""
  );
}

enum VanillaDeclarationType {
  STYLE = "style",
  CREATE_THEME = "createTheme",
  CREATE_THEME_CONTRACT = "createThemeContract",
}

type Rules = Map<string, string>;

class VanillaDeclaration {
  #name: string;
  #type: VanillaDeclarationType;
  #rules: Rules = new Map();
  #mediaQueries = new Map<string, Rules>();
  #selectors = new Map<string, Rules>();

  constructor(name: string, type: VanillaDeclarationType) {
    this.#name = name;
    this.#type = type;
  }

  setRule(prop: string, val: string) {
    this.#rules.set(prop, val);
  }

  private get rulesTemplate() {
    let template = ``;
    for (const [prop, val] of this.#rules) {
      template += `
  ${prop}: ${val};`;
    }
    return template;
  }

  toString() {
    return `.${this.#name} {${this.rulesTemplate}
}`;
  }
}

class VanillaStylesheet {
  declarations: Set<VanillaDeclaration> = new Set();
}

export function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  // const stylesheet = new VanillaStylesheet();
  const stylesheet: VanillaDeclaration[] = [];

  root.find(j.VariableDeclaration).forEach((variableDeclaration) => {
    j(variableDeclaration)
      .find(j.CallExpression)
      .forEach((callExpression) => {
        // @ts-expect-error
        const type: VanillaDeclarationType = callExpression.value.callee.name;
        const name = callExpression.parentPath.value.id.name;
        const declaration = new VanillaDeclaration(name, type);
        console.log({ type });

        if (type === VanillaDeclarationType.STYLE) {
          j(callExpression)
            .find(j.ObjectExpression)
            .forEach((objectExpression) => {
              j(objectExpression)
                .find(j.ObjectProperty)
                .forEach((objectProperty) => {
                  const key = objectProperty.get("key").value.name;
                  const value = objectProperty.get("value").value.value;

                  if (key === "selectors") {
                  } else if (key === "@media") {
                  } else {
                    if (key && value) {
                      declaration.setRule(kebabCase(key), value);
                    }
                  }
                });
            });

          stylesheet.push(declaration);
        }
      });
  });

  let template = "";
  for (const d of stylesheet) {
    template += `
${d.toString()}
`;
  }

  return template;
}

export const parser = "tsx";
