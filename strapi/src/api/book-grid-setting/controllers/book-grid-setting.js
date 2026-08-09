"use strict";
const { createCoreController } = require("@strapi/strapi").factories;

const ASPECT_MAP = {
  portrait_3_4: "3/4",
  portrait_2_3: "2/3",
  square_1_1: "1/1",
  landscape_4_3: "4/3",
};

module.exports = createCoreController("api::book-grid-setting.book-grid-setting", ({ strapi }) => ({
  async find(ctx) {
    const entity = await strapi.db.query("api::book-grid-setting.book-grid-setting").findOne({});
    if (!entity) {
      return ctx.send({
        page_size: 12,
        eyebrow_en: "Books",
        eyebrow_bn: "বই",
        columns_mobile: 2,
        columns_tablet: 3,
        columns_desktop: 4,
        gap: 40,
        cover_aspect_ratio: "2/3",
        card_radius: 12,
        show_author: true,
        show_free_badge: true,
        show_featured_badge: true,
        title_font_size: 20,
        author_font_size: 16,
        taxonomy_font_size: 14,
        title_lines: 2,
      });
    }
    return ctx.send({
      page_size: entity.page_size ?? 12,
      eyebrow_en: entity.eyebrow_en ?? "Books",
      eyebrow_bn: entity.eyebrow_bn ?? "বই",
      columns_mobile: entity.columns_mobile ?? 2,
      columns_tablet: entity.columns_tablet ?? 3,
      columns_desktop: entity.columns_desktop ?? 4,
      gap: entity.gap ?? 40,
      cover_aspect_ratio: ASPECT_MAP[entity.cover_aspect_ratio] || "2/3",
      card_radius: entity.card_radius ?? 12,
      show_author: entity.show_author ?? true,
      show_free_badge: entity.show_free_badge ?? true,
      show_featured_badge: entity.show_featured_badge ?? true,
      title_font_size: entity.title_font_size ?? 20,
      author_font_size: entity.author_font_size ?? 16,
      taxonomy_font_size: entity.taxonomy_font_size ?? 14,
      title_lines: entity.title_lines ?? 2,
    });
  },
}));
