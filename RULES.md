# Bodhi Mitra Engineering Rules

## 1. Purpose

Build a scalable, maintainable, secure, performant, accessible, and production-ready digital platform.

Prioritize engineering quality over implementation speed.

Protect architecture, consistency, and long-term maintainability.

Never introduce unnecessary technical debt.

---

## 2. Documentation

Project documentation:

- RULES.md
- PROJECT.md
- CHANGELOG.md

Priority order:

1. RULES.md
2. PROJECT.md
3. Approved implementation
4. CHANGELOG.md

Before every implementation:

- Read RULES.md.
- Read PROJECT.md.
- Read CHANGELOG.md only when historical context is required or when recording completed work.

Keep documentation synchronized with the implementation.

---

## 3. Engineering Principles

- Build platforms, not pages.
- Build modules, not isolated features.
- Reuse before creating.
- Simplicity over complexity.
- Consistency over creativity.
- Maintainability over convenience.
- Scalability over shortcuts.
- Correctness over speed.
- User experience over visual effects.
- Leave the project better than you found it.

---

## 4. Engineering Responsibilities

The development agent is responsible for:

- Architecture
- Frontend
- Backend
- Database
- APIs
- UI/UX
- Security
- Performance
- Accessibility
- Testing
- Documentation
- Code Review

Protect the project before implementing features.

---

## 5. Development Workflow

Always follow:

Understand

↓

Analyze

↓

Plan

↓

Implement

↓

Verify

↓

Optimize

↓

Document

↓

Complete

Never skip steps.

Never guess.

Never assume.

Always ask when clarification is required.

---

## 6. Decision Framework

When multiple solutions exist, prioritize:

1. Correctness
2. Security
3. Maintainability
4. Scalability
5. User Experience
6. Performance
7. Developer Experience
8. Development Speed

Never sacrifice long-term quality for short-term convenience.

---

## 7. Architecture Rules

Follow modular architecture.

Separate concerns.

Keep modules independent.

Avoid tight coupling.

Build reusable systems.

Prefer composition over duplication.

Every feature belongs to a logical module.

Never place business logic inside UI components.

Never access the database directly from presentation layers.

Keep responsibilities clearly separated.

Organize code by feature before file type.

Prefer reusable services over repeated implementations.

Design for future expansion.

Protect backward compatibility.

Avoid breaking changes unless approved.

---

## 8. Project Structure

Keep the project organized and predictable.

Follow the existing project structure.

Avoid unnecessary folders.

Avoid unnecessary nesting.

Group related files together.

Separate:

- UI
- Business Logic
- Data Access
- Utilities
- Configuration
- Types
- Assets
- Tests
- Documentation

Keep modules self-contained.

Never mix unrelated responsibilities.

---

## 9. Coding Standards

Write clean, readable, maintainable code.

Prefer clarity over cleverness.

Keep functions focused.

Keep components focused.

Keep files manageable.

Use meaningful names.

Avoid magic values.

Avoid duplicate logic.

Avoid dead code.

Remove unused imports.

Remove unused variables.

Remove temporary debugging code before completion.

Follow existing naming conventions.

Maintain consistent formatting.

Prefer configuration over hardcoding.

Handle errors gracefully.

Never ignore errors silently.

Always consider edge cases.

Always consider invalid input.

Code should be easy to understand without excessive comments.

Comments should explain *why*, not *what*.

---

## 10. Reusability

Search before creating.

Reuse existing:

- Components
- Hooks
- Utilities
- Services
- APIs
- Types
- Styles
- Helpers

Do not duplicate functionality.

If similar implementations exist, improve or extend them instead of creating new ones.

Create reusable solutions that benefit other parts of the project.

---

## 11. Refactoring

Improve code only when it provides clear value.

Avoid unnecessary rewrites.

Preserve existing functionality.

Keep changes incremental.

Avoid introducing regressions.

When significant refactoring is required:

- Explain why.
- Describe the impact.
- Update PROJECT.md if necessary.

Never refactor unrelated areas without approval.


---

## 12. Frontend Standards

Build responsive, accessible, and reusable interfaces.

Follow the design system.

Maintain visual consistency.

Prioritize usability.

Design mobile-first.

Support all common screen sizes.

Keep layouts flexible.

Avoid page-specific styling.

Prefer reusable components.

Prefer composition over duplication.

Separate presentation from business logic.

Keep state as local as possible.

Avoid unnecessary global state.

Optimize rendering.

Lazy load when appropriate.

Avoid unnecessary re-renders.

Keep interactions smooth and predictable.

Maintain consistent loading, empty, and error states.

---

## 13. UI & UX Standards

Prioritize clarity over decoration.

Maintain consistent spacing.

Maintain consistent typography.

Maintain consistent iconography.

Maintain consistent interaction patterns.

Use predictable navigation.

Provide immediate user feedback.

Prevent user errors.

Provide meaningful error messages.

Support keyboard navigation.

Support dark mode if implemented.

Never sacrifice usability for visual effects.

Maintain a premium reading experience.

---

## 14. Design System

Use design tokens.

Never hardcode:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Breakpoints
- Animation values

Reuse existing:

- Buttons
- Inputs
- Cards
- Dialogs
- Drawers
- Tabs
- Menus
- Toolbars
- Icons
- Layouts

Create new components only when necessary.

Update shared components instead of creating duplicates.

---

## 15. CMS & Admin Standards

Treat the CMS as a platform, not a collection of forms.

Everything manageable by administrators must be configurable through the CMS.

Avoid hardcoded content.

Keep the admin interface clean, intuitive, and consistent.

Provide validation for all editable fields.

Provide sensible defaults.

Support draft and published states where appropriate.

Use structured content instead of free-form layouts whenever possible.

Prefer reusable content blocks over page-specific implementations.

Keep all administrative actions predictable and reversible whenever practical.

---

## 16. Content Management

Content should be data-driven.

Avoid hardcoding text, links, images, metadata, or navigation.

Separate content from presentation.

Support reusable content.

Support categories, tags, and relationships.

Support media management.

Support SEO metadata.

Support future localization.

Design content models for long-term flexibility.

---

## 17. Reader Standards

Treat the reader as an application.

The reading experience is a core product.

Prioritize readability.

Maintain consistent navigation.

Support reading progress.

Support bookmarks.

Support annotations when implemented.

Support search.

Support table of contents.

Support responsive reading.

Optimize rendering for large documents.

Avoid unnecessary viewer reloads.

Protect licensed content according to access rules.

---

## 18. Commerce Standards

Separate commerce from presentation.

Products should remain independent of UI.

Support:

- Products
- Pricing
- Orders
- Payments
- User Library
- Purchase History
- Access Control
- Coupons
- Digital Downloads

Design commerce modules to support future payment providers without major architectural changes.

Never couple payment logic to UI components.


---

## 19. Backend Standards

Keep business logic independent from presentation.

Separate controllers, services, repositories, and utilities.

Validate all external input.

Sanitize all user-provided data.

Return consistent responses.

Avoid duplicated business logic.

Keep backend modules reusable and testable.

Never expose internal implementation details.

---

## 20. Database Standards

Design normalized and scalable data structures.

Use appropriate indexing.

Protect data integrity.

Avoid duplicated data.

Use transactions when consistency is required.

Protect authorization at the data layer.

Never bypass access control.

Design schemas for future expansion.

---

## 21. API Standards

Keep APIs consistent.

Use predictable request and response formats.

Validate every request.

Return meaningful status codes.

Provide meaningful error responses.

Avoid unnecessary endpoints.

Design APIs for long-term compatibility.

Document breaking changes.

---

## 22. Security Standards

Treat all external input as untrusted.

Validate and sanitize all input.

Escape output when required.

Protect authentication and authorization.

Apply the principle of least privilege.

Protect secrets and credentials.

Never expose sensitive information.

Follow current security best practices.

Security takes priority over convenience.

---

## 23. Performance Standards

Design for performance from the beginning.

Measure before optimizing.

Avoid unnecessary rendering.

Avoid unnecessary network requests.

Optimize assets.

Optimize bundle size.

Optimize database queries.

Optimize loading strategies.

Prefer scalable solutions over quick fixes.

---

## 24. Accessibility Standards

Accessibility is mandatory.

Support keyboard navigation.

Use semantic markup.

Provide accessible labels.

Maintain readable contrast.

Support screen readers.

Avoid accessibility regressions.

---

## 25. Dependency Policy

Prefer mature and actively maintained open-source libraries.

Evaluate existing project dependencies before adding new ones.

Avoid unnecessary packages.

Build custom solutions only when existing libraries cannot satisfy project requirements.

Never replace stable dependencies without engineering justification.

---

## 26. Configuration Standards

Never hardcode:

- Secrets
- API Keys
- Tokens
- Passwords
- URLs
- Environment-specific values

Use configuration and environment variables.

Keep configuration centralized.

---

## 27. Scope Management

Implement only the approved scope.

Avoid unrelated changes.

Avoid unnecessary redesigns.

Document future improvements instead of implementing them without approval.

Keep pull requests and commits focused.

---

## 28. Testing & Quality Assurance

Verify every implementation before completion.

Review:

- Functionality
- Existing features
- Responsiveness
- Accessibility
- Security
- Performance
- Documentation

Never mark work complete without verification.

Clearly communicate any required manual testing.

---

## 29. Documentation Standards

Keep documentation synchronized with implementation.

Update PROJECT.md whenever implementation changes.

Update CHANGELOG.md after completed work.

Document architectural decisions.

Document limitations when necessary.

Never leave outdated documentation.

---

## 30. Manual Assistance

Pause implementation whenever the task requires:

- External credentials
- Environment configuration
- Package installation requiring approval
- Infrastructure changes
- Database migrations
- Payment providers
- Third-party accounts
- Deployment
- Destructive operations
- Major architectural decisions

Explain why assistance is required before proceeding.

Never guess.

---

## 31. Git Workflow

Keep commits focused.

Commit only working code.

Use meaningful Conventional Commit messages.

Do not rewrite history unless instructed.

Do not push unless instructed.

Verify project status before committing.

---

## 32. Continuous Improvement

Every implementation should improve the project.

Improve readability.

Improve maintainability.

Improve consistency.

Reduce technical debt.

Fix nearby issues within scope.

Document larger improvements for future implementation.

Never leave the project in a worse state.

---

## 33. Definition of Done

A task is complete only when:

- Requirements are satisfied.
- Existing functionality remains intact.
- Architecture remains consistent.
- Code quality meets project standards.
- Security has been considered.
- Performance has been considered.
- Documentation has been updated.
- Verification has been completed.
- Manual testing requirements have been communicated when necessary.