/** Schema.org structured data generators */

interface JsonLdBase {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

/** Generate WebSite structured data (homepage) */
export function generateWebSiteSchema(baseUrl: string, name: string, description: string): JsonLdBase {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Generate Organization structured data */
export function generateOrganizationSchema(baseUrl: string, name: string, socialLinks: Record<string, string>): JsonLdBase {
  const sameAs: string[] = [];
  if (socialLinks.facebook) sameAs.push(socialLinks.facebook);
  if (socialLinks.twitter) sameAs.push(socialLinks.twitter);
  if (socialLinks.instagram) sameAs.push(socialLinks.instagram);
  if (socialLinks.linkedin) sameAs.push(socialLinks.linkedin);
  if (socialLinks.youtube) sameAs.push(socialLinks.youtube);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: baseUrl,
    sameAs,
  };
}

/** Generate Article structured data (posts) */
export function generateArticleSchema(options: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  siteName: string;
}): JsonLdBase {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.title,
    description: options.description,
    url: options.url,
    image: options.imageUrl || undefined,
    datePublished: options.datePublished,
    dateModified: options.dateModified || options.datePublished,
    author: {
      "@type": "Person",
      name: options.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: options.siteName,
    },
  };
}

/** Generate Book structured data */
export function generateBookSchema(options: {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  author?: string;
  isbn?: string;
  price?: number;
  currency?: string;
  rating?: number;
  ratingCount?: number;
}): JsonLdBase {
  const schema: JsonLdBase = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: options.name,
    description: options.description,
    url: options.url,
  };

  if (options.imageUrl) schema.image = options.imageUrl;
  if (options.author) schema.author = { "@type": "Person", name: options.author };
  if (options.isbn) schema.isbn = options.isbn;

  if (options.price !== undefined && options.price > 0) {
    schema.offers = {
      "@type": "Offer",
      price: options.price,
      priceCurrency: options.currency || "USD",
      availability: "https://schema.org/InStock",
    };
  } else {
    schema.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: options.currency || "USD",
      availability: "https://schema.org/InStock",
    };
  }

  if (options.rating !== undefined && options.ratingCount !== undefined) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: options.rating,
      reviewCount: options.ratingCount,
    };
  }

  return schema;
}

/** Generate BreadcrumbList structured data */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLdBase {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Generate Course structured data */
export function generateCourseSchema(options: {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  provider?: string;
}): JsonLdBase {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: options.name,
    description: options.description,
    url: options.url,
    image: options.imageUrl || undefined,
    provider: options.provider ? { "@type": "Organization", name: options.provider } : undefined,
  };
}

/** Generate FAQ structured data */
export function generateFaqSchema(faqs: Array<{ question: string; answer: string }>): JsonLdBase {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
