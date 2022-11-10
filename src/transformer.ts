import type { API, FileInfo } from "jscodeshift";

const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;

function kebabCase(str: string) {
  return (
    str?.replace(KEBAB_REGEX, function (match) {
      return "-" + match.toLowerCase();
    }) ?? ""
  );
}

enum VanillaRuleType {
  MEDIA_QUERY = "@media",
  SELECTORS = "selectors",
}

enum VanillaMethod {
  STYLE = "style",
  CREATE_THEME = "createTheme",
  CREATE_THEME_CONTRACT = "createThemeContract",
}

type Rules = Map<string, string>;

// TODO: Parse rules w/ variables (recursively?)

class VanillaDeclaration {
  readonly #name: string;
  readonly #method: VanillaMethod;

  #rules: Rules = new Map();
  mediaQueries = new Map<string, Rules>();
  selectors = new Map<string, Rules>();

  constructor(name: string, type: VanillaMethod) {
    this.#name = name;
    this.#method = type;
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

  renderClassName() {
    return `.${this.#name}`;
  }

  toString() {
    return `${this.renderClassName()} {${this.rulesTemplate}
}`;
  }
}

class VanillaStylesheet {
  declarations: Set<VanillaDeclaration> = new Set();
  themeContract: Record<string, Record<string, string>> = {};
}

export function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  // const stylesheet = new VanillaStylesheet();
  const stylesheet = new VanillaStylesheet();

  root.find(j.VariableDeclaration).forEach((variableDeclaration) => {
    j(variableDeclaration)
      .find(j.CallExpression)
      .forEach((callExpression) => {
        // Make sure the call expression has a name.
        if (
          "name" in callExpression.node.callee &&
          typeof callExpression.node.callee.name === "string"
        ) {
          const method = callExpression.node.callee.name;
          const className = callExpression.parentPath.value.id.name;
          const declaration = new VanillaDeclaration(
            className,
            method as VanillaMethod
          );

          callExpression.node.arguments.forEach((arg) => {
            // @ts-ignore
            (arg?.properties || []).forEach((prop) => {
              const key =
                prop.key.name || (prop.key.value as VanillaRuleType | string);
              const value = prop.value.value;

              if (method === VanillaMethod.CREATE_THEME_CONTRACT) {
                stylesheet.themeContract = {
                  ...stylesheet.themeContract,
                  [key]: value,
                };
              }

              switch (key) {
                case VanillaRuleType.SELECTORS:
                  (prop.value.properties || []).forEach((prop1: any) => {
                    const selector = prop1.key.value || prop1.key.name;
                    const rules = new Map();
                    (prop1.value.properties || []).forEach((prop2: any) => {
                      const ruleKey = prop2.key.value || prop2.key.name
                      rules.set(
                        kebabCase(ruleKey),
                        prop2.value.value
                      );
                    });
                    declaration.selectors.set(selector, rules);
                  });
                  break;
                case VanillaRuleType.MEDIA_QUERY:
                  // TODO handle media queries
                  break;
                default:
                  if (
                    method === VanillaMethod.CREATE_THEME_CONTRACT ||
                    method === VanillaMethod.CREATE_THEME
                  ) {
                    declaration.setRule(`--${kebabCase(key)}`, value);
                  } else {
                    if (value) {
                      declaration.setRule(kebabCase(key), value);
                    } else {
                      // is reference
                      const varRef = prop.value.property.name;
                      if (stylesheet.themeContract[varRef]) {
                        declaration.setRule(
                          kebabCase(key),
                          `var(--${kebabCase(varRef)})`
                        );
                      }
                    }
                  }
                  break;
              }
            });
          });

          stylesheet.declarations.add(declaration);
        }
      });
  });

  let template = "";
  for (const d of stylesheet.declarations) {
    template += `
${d.toString()}
`;
    for (const [selector, rules] of d.selectors) {
      console.log(selector);
      template += `${selector.replace("&", d.renderClassName())} {`;
      for (const [key, value] of rules) {
        template += `
  ${key}: ${value};
`;
      }
      template += "}\n";
    }
  }

  return template;
}

export const parser = "tsx";
