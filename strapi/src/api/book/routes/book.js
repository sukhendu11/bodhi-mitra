"use strict";

/**
 * book router
 *
 * Custom routes for book library features
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

const customRoutes = [
  {
    method: "GET",
    path: "/books/featured",
    handler: "book.getFeatured",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/books/category/:slug",
    handler: "book.getByCategory",
    config: {
      auth: false,
    },
  },
];

module.exports = (opts) => {
  const { strapi } = opts;
  const defaultRouter = createCoreRouter("api::book.book");
  return {
    routes: [...customRoutes, ...defaultRouter.routes],
  };
};
