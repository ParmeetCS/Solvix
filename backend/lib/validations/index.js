// Validation helpers (Zod). Concrete schemas for each endpoint are added here
// as business modules are implemented. This file exists so endpoints have a
// single, importable location for request validation without introducing
// extra frameworks.
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID.'),
});

export default { paginationSchema, uuidParamSchema };
