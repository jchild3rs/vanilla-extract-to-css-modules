import { program } from "commander";
import path from "path";

const { run: jscodeshift } = require("jscodeshift/src/Runner");

program
  .option("-p, --path <glob>", "E.g., ./**/*.css.ts")
  .option("-v, --var-path <path>", "E.g., ./some/path/vars.css.ts");

program.parse();

const options = program.opts();

console.log(options);

const transformPath = path.join(__dirname, "transform.js");

type Result = {
  stats: any;
  timeElapsed: string;
  error: number;
  ok: number;
  nochange: number;
  skip: number;
};

async function run(): Promise<Result> {
  // todo glob
  const result: Result = jscodeshift(transformPath, [options.path], {
    dry: true,
    print: true,
  });

  return result;
}

run();
/*
{
  stats: {},
  timeElapsed: '0.001',
  error: 0,
  ok: 0,
  nochange: 0,
  skip: 0
}
*/
