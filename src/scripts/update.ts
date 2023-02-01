import "dotenv/config";
import { updateIncentivizedArchaeologists } from "../utils/db";

await updateIncentivizedArchaeologists();
process.exit(0);