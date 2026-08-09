"use strict";

/**
 * book controller
 *
 * Custom controller for book library features.
 *
 * NOTE (2026-08-08): app-data lookups (purchases, ratings) were removed —
 * user data lives only in Supabase. The custom findOne enrichment
 * (is_purchased / avg_rating / rating_count) is gone; core controller
 * behavior applies. Only content-layer helpers remain below.
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::book.book", ({ strapi }) => ({
  // Get featured books
  async getFeatured(ctx) {
    const books = await strapi.entityService.findMany("api::book.book", {
      filters: {
        featured: true,
        book_status: "published",
      },
      populate: ["cover_image", "categories"],
      sort: { sort_order: "asc" },
      limit: 10,
    });

    return { data: books };
  },

  // Get books by category
  async getByCategory(ctx) {
    const { slug } = ctx.params;

    const category = await strapi.entityService.findMany("api::category.category", {
      filters: { slug },
    });

    if (!category || category.length === 0) {
      return ctx.notFound("Category not found");
    }

    const books = await strapi.entityService.findMany("api::book.book", {
      filters: {
        categories: { id: category[0].id },
        book_status: "published",
      },
      populate: ["cover_image", "categories"],
      sort: { sort_order: "asc" },
    });

    return { data: books };
  },
}));
