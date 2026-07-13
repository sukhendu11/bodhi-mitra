import {
  registerContentType,
  BASIC_WORKFLOW,
  EXTENDED_WORKFLOW,
  BILINGUAL_TITLE_FIELDS,
  BILINGUAL_DESCRIPTION_FIELDS,
  SEO_METADATA_FIELDS,
  TIMESTAMP_FIELDS,
} from "./content-type";
import type { ContentTypeDefinition } from "./content-type";
import {
  registerRelationships,
  CATEGORY_RELATIONSHIP,
  TAGS_RELATIONSHIP,
  authorRelationship,
  childrenRelationship,
} from "./relationships";

/* ─── Posts ───────────────────────────────────────────────────────── */

const postsDefinition: ContentTypeDefinition = {
  name: "post",
  table: "posts",
  label: "Post",
  labelPlural: "Posts",
  description: "Bilingual journal entries with categories and tags",
  slug: { sourceFields: ["title_en", "title"], unique: true, maxLength: 100 },
  workflow: BASIC_WORKFLOW,
  fields: [
    ...BILINGUAL_TITLE_FIELDS,
    ...BILINGUAL_DESCRIPTION_FIELDS,
    ...SEO_METADATA_FIELDS,
    ...TIMESTAMP_FIELDS,
  ],
  routes: { public: "/posts/:slug", adminList: "/admin", adminEdit: "/admin/$id" },
  hasRevisions: true,
  hasSeo: true,
  hasTags: true,
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
};

registerContentType(postsDefinition);

registerRelationships("post", [
  CATEGORY_RELATIONSHIP,
  TAGS_RELATIONSHIP,
  authorRelationship("author_name"),
]);

/* ─── Pages ───────────────────────────────────────────────────────── */

const pagesDefinition: ContentTypeDefinition = {
  name: "page",
  table: "pages",
  label: "Page",
  labelPlural: "Pages",
  description: "Static pages with drag-and-drop section builder",
  slug: { sourceFields: ["title_en"], unique: true, maxLength: 80 },
  fields: [
    ...BILINGUAL_TITLE_FIELDS,
    ...BILINGUAL_DESCRIPTION_FIELDS,
    ...SEO_METADATA_FIELDS,
    ...TIMESTAMP_FIELDS,
  ],
  routes: { public: "/:slug", adminList: "/admin/pages" },
  hasSeo: true,
  defaultSortField: "sort_order",
  defaultSortOrder: "asc",
};

registerContentType(pagesDefinition);

/* ─── Books ───────────────────────────────────────────────────────── */

const booksDefinition: ContentTypeDefinition = {
  name: "book",
  table: "books",
  label: "Book",
  labelPlural: "Books",
  description: "Digital book collection with PDF downloads",
  slug: { sourceFields: ["title_en"], unique: true, maxLength: 100 },
  workflow: EXTENDED_WORKFLOW,
  fields: [
    ...BILINGUAL_TITLE_FIELDS,
    ...BILINGUAL_DESCRIPTION_FIELDS,
    ...SEO_METADATA_FIELDS,
    ...TIMESTAMP_FIELDS,
  ],
  routes: { public: "/books#:slug", adminList: "/admin/books" },
  hasSeo: true,
  hasTags: true,
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
};

registerContentType(booksDefinition);

registerRelationships("book", [TAGS_RELATIONSHIP, authorRelationship("author_name")]);

/* ─── Videos ──────────────────────────────────────────────────────── */

const videosDefinition: ContentTypeDefinition = {
  name: "video",
  table: "videos",
  label: "Video",
  labelPlural: "Videos",
  description: "YouTube video collection",
  workflow: BASIC_WORKFLOW,
  fields: [...TIMESTAMP_FIELDS],
  routes: { adminList: "/admin/videos" },
  hasSeo: false,
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
};

registerContentType(videosDefinition);

/* ─── Courses ─────────────────────────────────────────────────────── */

const coursesDefinition: ContentTypeDefinition = {
  name: "course",
  table: "courses",
  label: "Course",
  labelPlural: "Courses",
  description: "Structured courses with sequential lessons",
  slug: { sourceFields: ["title_en"], unique: true, maxLength: 80 },
  fields: [...BILINGUAL_TITLE_FIELDS, ...BILINGUAL_DESCRIPTION_FIELDS, ...TIMESTAMP_FIELDS],
  routes: {
    public: "/courses/:slug",
    adminList: "/admin/courses",
    adminEdit: "/admin/courses/$id",
  },
  hasSeo: true,
  defaultSortField: "sort_order",
  defaultSortOrder: "asc",
};

registerContentType(coursesDefinition);

registerRelationships("course", [childrenRelationship("course_lesson", "course_id", "Lessons")]);
