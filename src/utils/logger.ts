import chalk from "chalk";

export const logColors = {
  error: chalk.bold.red,
  warning: chalk.hex("#d8972f"),
  muted: chalk.dim,
  green: chalk.green,
};

export const logging = {
  debug: (msg: any) => {
    if (process.env.DEBUG) {
      const debugLog = logColors.muted(
        `debug-${process.env.npm_package_version}::${msg}`
      );
      console.log(debugLog);
    }
  },
  info: (msg: string) => console.log(logColors.muted(msg)),
  notice: (msg: string) => console.log(logColors.green(msg)),
  warn: (msg: string) => console.log(logColors.warning(msg)),
  error: (msg: string) => console.log(logColors.error(msg)),
};
