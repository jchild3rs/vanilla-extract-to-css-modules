import type { API, FileInfo } from "jscodeshift";

const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;

enum VanillaRuleType {
  MEDIA_QUERY = "@media",
  SELECTORS = "selectors",
}

enum VanillaMethod {
  STYLE = "style",
  CREATE_THEME = "createTheme",
  CREATE_THEME_CONTRACT = "createThemeContract",
}

function kebabCase(str: string) {
  return (
    str?.replace(KEBAB_REGEX, function (match) {
      return "-" + match.toLowerCase();
    }) ?? ""
  );
}

function formatRuleName(str: string) {
  return kebabCase(str);
}

// TODO this is probably not good enough...
function formatRuleValue(ruleName: string, ruleValue: string | number) {
  if (typeof ruleValue === "number" && ruleName !== "lineHeight") {
    return `${ruleValue}px`;
  }
  return ruleValue;
}

// TODO fix types
function parseRules(properties: any[], rulesMap: Map<string, Rules>) {
  for (const styleProperty of properties) {
    const selector = styleProperty.key.value || styleProperty.key.name;
    const rules = new Rules();

    for (const ruleProperty of styleProperty.value.properties || []) {
      const ruleKey = ruleProperty.key.value || ruleProperty.key.name;
      rules.setRule(ruleKey, ruleProperty.value.value);
    }

    rulesMap.set(selector, rules);
  }
}

class Rules {
  #rules = new Map<string, string | number>();

  setRule(name: string, value: string | number) {
    this.#rules.set(formatRuleName(name), formatRuleValue(name, value));
  }

  getAllRules() {
    return this.#rules;
  }
}

class StylesheetDeclaration {
  readonly #name: string;
  readonly #method: VanillaMethod;

  rules = new Rules();
  mediaQueries = new Map<string, Rules>();
  selectors = new Map<string, Rules>();

  constructor(name: string, type: VanillaMethod) {
    this.#name = name;
    this.#method = type;
  }

  setRule(name: string, value: string | number) {
    this.rules.setRule(name, value);
  }

  private get rulesTemplate() {
    let template = ``;
    for (const [prop, val] of this.rules.getAllRules()) {
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
  declarations: Set<StylesheetDeclaration> = new Set();

  themeContract: Record<string, Record<string, string>> = {};

  toSource() {
    let template = "";
    for (const declaration of this.declarations) {
      template += `
${declaration.renderClassName()} {`;
      for (const [prop, val] of declaration.rules.getAllRules()) {
        template += `
  ${prop}: ${val};`;
      }
      template += `
}
`;
      for (const [selector, selectorRules] of declaration.selectors) {
        template += `
${selector.replace("&", declaration.renderClassName())} {`;
        for (const [key, value] of selectorRules.getAllRules()) {
          template += `
  ${key}: ${value};
`;
        }
        template += `}
`;
      }

      for (const [mediaQuery, mediaQueryRules] of declaration.mediaQueries) {
        template += `
@media ${mediaQuery} {
  ${declaration.renderClassName()} {`;
        for (const [key, value] of mediaQueryRules.getAllRules()) {
          template += `
    ${key}: ${value};
  `;
        }
        template += `}
}`;
      }
    }

    return template;
  }
}

export function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const stylesheet = new VanillaStylesheet();

  root.find(j.VariableDeclaration).forEach((variableDeclaration) => {
    j(variableDeclaration)
      .find(j.CallExpression)
      .forEach((callExpression) => {
        if (
          "name" in callExpression.node.callee &&
          typeof callExpression.node.callee.name === "string"
        ) {
          const method = callExpression.node.callee.name;
          const className = callExpression.parentPath.value.id.name;
          const declaration = new StylesheetDeclaration(
            className,
            method as VanillaMethod
          );

          for (const arg of callExpression.node.arguments) {
            if (!("properties" in arg)) {
              continue;
            }

            // TODO fix types
            for (const property of arg.properties as any[]) {
              const key =
                property.key.name ||
                (property.key.value as VanillaRuleType | string);
              const value = property.value.value;

              if (method === VanillaMethod.CREATE_THEME_CONTRACT) {
                stylesheet.themeContract = {
                  ...stylesheet.themeContract,
                  [key]: value,
                };
              }

              switch (key) {
                case VanillaRuleType.SELECTORS:
                  parseRules(property.value.properties, declaration.selectors);
                  break;
                case VanillaRuleType.MEDIA_QUERY:
                  parseRules(
                    property.value.properties,
                    declaration.mediaQueries
                  );
                  break;
                default:
                  if (
                    method === VanillaMethod.CREATE_THEME_CONTRACT ||
                    method === VanillaMethod.CREATE_THEME
                  ) {
                    declaration.setRule(`--${key}`, value);
                  } else if (value) {
                    declaration.setRule(key, value);
                  } else {
                    const varRef = property.value.property.name;

                    if (stylesheet.themeContract[varRef]) {
                      declaration.setRule(key, kebabCase(`var(--${varRef})`));
                    }
                  }
                  break;
              }
            }
          }

          stylesheet.declarations.add(declaration);
        }
      });
  });

  return stylesheet.toSource();
}

export const parser = "tsx";
