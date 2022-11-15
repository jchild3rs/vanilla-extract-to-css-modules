// @ts-nocheck
import * as fs from "fs";

export const parser = "tsx";
const {join} = require('path')

const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;

function kebabCase(str) {
  return str
    ? str.replace(KEBAB_REGEX, function (match) {
      return "-" + match.toLowerCase();
    })
    : "";
}

function parseRules(properties, rulesMap, j) {
  for (const styleProperty of properties) {
    let selector = styleProperty.key.value || styleProperty.key.name;
    const rules = new Map();

    if (styleProperty.key.type === "MemberExpression") {
      if (styleProperty.key.object.name === "breakpoints") {
        selector = `(--screen-${styleProperty.key.property.name || styleProperty.key.property.value})`;
      }
    }

    for (const ruleProperty of styleProperty.value.properties || []) {
      let ruleKey = ruleProperty.key.value || ruleProperty.key.name;
      // console.log({ ruleKey });
      const ruleIsValid =
        ruleProperty.value.type === "StringLiteral" ||
        ruleProperty.value.type === "NumericLiteral" ||
        ruleProperty.value.type === "NullLiteral";

      if (ruleIsValid) {
        if (ruleProperty.value.type === "NumericLiteral") {
          if (ruleKey !== "lineHeight") {
            rules.set(ruleKey, `${ruleProperty.value.value}px`);
            // style.rules.set(key, );
          } else {
            // style.rules.set(key, prop.value.value);
            rules.set(ruleKey, ruleProperty.value.value);
          }
        } else {
          rules.set(ruleKey, kebabCase(ruleProperty.value.value));
          // style.rules.set(key, prop.value.value);
        }
      } else if (ruleProperty.value.type === "ObjectExpression") {
        for (const ruleProperty1 of ruleProperty.value.properties || []) {
          if (ruleIsValid) {
            rules.set(ruleKey, kebabCase(ruleProperty1.value.value));
          }
        }
      } else if (ruleProperty.value.type === "MemberExpression") {
        const tokens = [];
        const more = [];
        j(ruleProperty)
          .find([j.Identifier])
          .filter((path) => path.type === "object" || path.name === "property")
          .forEach((path, i) => {
            // console.log(path);
            if (
              !path.value.name.toLowerCase().includes("theme") &&
              !path.value.name.toLowerCase().includes("contract")
            ) {
              tokens.push(path.value.name);
            }

            const extra = path.parentPath.parentPath.value;
            if (extra) {
              if (extra.property) {
                if (extra.property.value) {
                  more.push(extra.property.value);
                }
              }
            }
          });

        if (tokens.length > 0) {
          rules.set(ruleKey, kebabCase(`var(--${tokens.concat(more).join("-")})`));
        }
      }
    }

    rulesMap.set(selector, rules);
  }
}

class Style {
  rules = new Map();
  mediaQueries = new Map();
  selectors = new Map();
}

class Stylesheet {
  themes = new Map();
  styles = new Map();

  toSource() {
    let template = "";

    for (const [themeName, theme] of this.themes) {
      template += `
.${themeName} {`;
      for (const [prop, value] of theme.vars) {
        template += `
  ${prop}: ${value};`;
      }
      template += `
}
`;
    }

    for (const [className, style] of this.styles) {
      if (style.rules.size > 0) {
        template += `
.${className} {`;
        for (const [prop, value] of style.rules) {
          if (prop === "@media" || prop === "selectors") continue;
          template += `
  ${kebabCase(prop)}: ${value};`;
        }
        template += `
}
`;
      }

      if (style.selectors) {
        for (const [prop, value] of style.selectors) {
          template += `
.${className}`;

          if (prop) {
            template += `${prop.replace("&", "")} {`;
            for (const [p, v] of value) {
              template += `
  ${kebabCase(p)}: ${p === "content" && !v ? '""' : v};`;
            }
            template += `
}
`;
          }
        }
      }
      if (style.mediaQueries) {
        for (const [prop, value] of style.mediaQueries) {
          template += `
@media ${prop} {`;

          template += `
  .${className} {`;
          for (const [p, v] of value) {
            template += `
    ${kebabCase(p)}: ${v};`;
          }
          template += `
  }
}
`;
        }
      }
    }

    return template;
  }
}

export default function transformer({ path, source }, api, { dry }) {
  // console.log(file, options);
  const j = api.jscodeshift;
  const root = j(source);
  const variableDeclarators = root.findVariableDeclarators();
  const stylesheet = new Stylesheet();

  variableDeclarators.forEach((variableDeclarator) => {
    j(variableDeclarator)
      .find(j.CallExpression)
      .forEach((callExp) => {
        if (callExp.node.callee.name === "createTheme" || callExp.node.callee.name === "createThemeContract") {
          const themeName = variableDeclarator.value.id.name;

          callExp.value.arguments
            .filter((path) => path.type === "ObjectExpression")
            .forEach((arg) => {
              const varsRaw = {};
              const vars = new Map();

              arg.properties.forEach((prop) => {
                const key = prop.key.name;

                const ruleIsValid =
                  prop.value.type === "StringLiteral" ||
                  prop.value.type === "NumericLiteral" ||
                  prop.value.type === "NullLiteral";
                if (ruleIsValid) {
                  if (prop.value.type === "NumericLiteral") {
                  }
                  vars.set(kebabCase(`--${key}`), prop.value.value || "inherit");
                  varsRaw[key] = prop.value.value || null;
                } else if (prop.value.type === "ObjectExpression") {
                  prop.value.properties.forEach((prop2) => {
                    if (
                      prop2.value.type === "StringLiteral" ||
                      prop2.value.type === "NumericLiteral" ||
                      prop2.value.type === "NullLiteral"
                    ) {
                      vars.set(kebabCase(`--${key}-${prop2.key.name}`), prop2.value.value || "inherit");
                      varsRaw[key] = varsRaw[key] || {};
                      varsRaw[key][prop2.key.name] = prop2.value.value || null;
                    }
                  });
                }
              });

              stylesheet.themes.set(themeName, { vars, varsRaw });
            });
        } else if (callExp.node.callee.name === "style") {
          const className = variableDeclarator.value.id.name;

          callExp.value.arguments
            .filter((path) => path.type === "ObjectExpression")
            .forEach((arg) => {
              const style = new Style();
              //parseRules(arg.properties, style.rules, j);
              arg.properties.forEach((prop) => {
                const key = prop.key.name || prop.key.value;

                if (key === "selectors") {
                  parseRules(prop.value.properties, style.selectors, j);
                } else if (key === "@media") {
                  parseRules(prop.value.properties, style.mediaQueries, j);
                } else {
                  if (
                    prop.value.type === "StringLiteral" ||
                    prop.value.type === "NumericLiteral" ||
                    prop.value.type === "NullLiteral"
                  ) {
                    if (prop.value.type === "NumericLiteral") {
                      if (key !== "lineHeight") {
                        style.rules.set(key, `${prop.value.value}px`);
                      } else {
                        style.rules.set(key, prop.value.value);
                      }
                    } else {
                      style.rules.set(key, prop.value.value);
                    }
                  } else if (prop.value.type === "MemberExpression") {
                    const tokens = [];
                    const more = [];
                    j(prop)
                      .find(j.Identifier)
                      //.filter((path) => path.parentPath.type === "object" || path.parentPath.name === "property")
                      .forEach((path, i) => {
                        if (i !== 0 && path.value.name !== "vars") {
                          if (
                            !path.value.name.toLowerCase().includes("theme") &&
                            !path.value.name.toLowerCase().includes("contract")
                          ) {
                            tokens.push(kebabCase(path.value.name));
                          }

                          // console.log(path.value.name);
                        }

                        const extra = path.parentPath.value.value;
                        if (extra) {
                          if (extra.property) {
                            if (extra.property.value) {
                              more.push(extra.property.value);
                            }
                          }
                        }
                      });

                    //console.log(tokens);

                    style.rules.set(key, kebabCase(`var(--${tokens.concat(more).join("-")})`));
                  }
                }
                //console.log(prop);
              });
              stylesheet.styles.set(className, style);
            });
        }
      });
  });

  if (!dry) {
    const newPath = join(process.cwd(), path).replace('.css.ts', '.module.css')
    fs.writeFileSync(newPath, stylesheet.toSource(), 'utf-8')


    return source
  }

  return stylesheet.toSource()
}
