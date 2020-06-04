//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("github-extension: config: set");

export const set = {
  action: ({ argv }: args) => {
    log("Setting config");
    const config: Partial<Config> = readJsonSync(configFilePath);
    (Object.keys(argv) as Array<keyof Config>).forEach((k) => {
      if (Object.values(ConfigKeys).includes(k)) {
        log(`Overriding config for ${k}`);
        log(`Current: ${config[k]}. New: ${argv[k]}`);
        config[k] = argv[k];
      }
    });

    log(`Writing updated config file: ${configFilePath}`);
    outputJsonSync(configFilePath, config);
  },
  desc: "Set AMPLIFY Central github-extension configuration",
  aliases: ["set"],
  options: {
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Set environment name to create",
    "--icon [value]": "Set absolute path for custom icon",

    "--git-token [value]": "github access_token",
    "--git-user-name [value]": "github username",
    "--repo [value]": "repository to search in",
    "--branch [value]": "repository branch to search in",

   
  },
};
