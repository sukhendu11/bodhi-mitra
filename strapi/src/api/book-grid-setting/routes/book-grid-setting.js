"use strict";
const { createCoreRouter } = require("@strapi/strapi").factories;
const customRoutes = [
  {
    method: "GET",
    path: "/book-grid-config",
    handler: "book-grid-setting.find",
    config: { auth: false },
  },
];
module.exports = (opts) => {
  const { strapi } = opts;
  const defaultRouter = createCoreRouter("api::book-grid-setting.book-grid-setting");
  return {
    routes: [...customRoutes, ...defaultRouter.routes],
  };
};
