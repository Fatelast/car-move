import { createParkingRuleHandler } from "./parkingRuleApi.js";

const parseParkingRule = createParkingRuleHandler();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/parse-parking-rule") {
      return parseParkingRule(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
