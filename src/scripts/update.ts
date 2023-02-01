import { validateEnvVars } from "../utils/validate-env";
import { updateIncentivizedArchaeologists } from "../utils/db";

validateEnvVars();

await updateIncentivizedArchaeologists();
process.exit(0);
