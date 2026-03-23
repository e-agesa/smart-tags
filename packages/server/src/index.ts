import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`Scan pages: ${env.BASE_URL}/s/<tagCode>`);
});
