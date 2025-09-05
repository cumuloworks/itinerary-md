# Alias Import Conventions

This document outlines the alias import conventions configured across the monorepo.

## Overview

Path aliases are configured to provide cleaner and more maintainable import statements across the codebase. Instead of relative imports like `../../../components/Button`, you can use `@components/Button`.

## Configured Aliases

### Studio App (`apps/studio`)

The following aliases are available in the Studio app:

- `@components/*` → `src/components/*`
- `@pages/*` → `src/pages/*`
- `@styles/*` → `src/styles/*`
- `@types/*` → `src/types/*`
- `@utils/*` → `src/utils/*`
- `@lib/*` → `src/lib/*`

#### Example Usage

```typescript
// Before
import Header from '../components/Header.astro';
import { formatDate } from '../../utils/date';

// After
import Header from '@components/Header.astro';
import { formatDate } from '@utils/date';
```

### Editor Package (`packages/editor`)

The following aliases are available in the Editor package:

- `@components/*` → `src/components/*`
- `@hooks/*` → `src/hooks/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@lib/*` → `src/lib/*`

Additionally, for development:
- `remark-itinerary` → `../core/src`
- `remark-itinerary-alert` → `../alert/src`

#### Example Usage

```typescript
// Before
import { useAutosave } from '../../hooks/useAutosave';
import Button from '../components/Button';

// After
import { useAutosave } from '@hooks/useAutosave';
import Button from '@components/Button';
```

### Core Package (`packages/core`)

The following aliases are available in the Core package:

- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@lib/*` → `src/lib/*`

## Configuration Files

### TypeScript Configuration

Each package has its own `tsconfig.json` with the following structure:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      // ... other aliases
    }
  }
}
```

### Build Tool Configuration

#### Astro/Vite (Studio App)

Configured in `astro.config.mjs`:

```javascript
vite: {
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      // ... other aliases
    }
  }
}
```

#### Vite (Editor Package)

Configured in `vite.config.ts`:

```javascript
resolve: {
  alias: {
    '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
    // ... other aliases
  }
}
```

## Best Practices

1. **Use aliases for internal imports**: Always use alias imports when importing from within the same package.

2. **Consistency**: Use the same alias pattern across all packages for similar directories (e.g., `@components`, `@utils`).

3. **Avoid circular dependencies**: Be careful when using aliases to not create circular dependencies between modules.

4. **IDE Support**: Ensure your IDE/editor recognizes the TypeScript path mappings for proper IntelliSense support.

5. **New directories**: When adding new directories that should have aliases, update both the TypeScript config and the build tool config.

## Migration Guide

To migrate existing code to use alias imports:

1. Identify relative imports in your code
2. Replace them with the appropriate alias
3. Run TypeScript checking to ensure all imports resolve correctly
4. Test the build to ensure bundling works correctly

### Example Migration

```typescript
// Old import
import { Button } from '../../../components/ui/Button';
import { useDebounce } from '../../hooks/useDebounce';
import type { User } from '../../../types/user';

// New import
import { Button } from '@components/ui/Button';
import { useDebounce } from '@hooks/useDebounce';
import type { User } from '@types/user';
```

## Troubleshooting

### Import not resolving

1. Check that the alias is configured in both `tsconfig.json` and the build tool config
2. Ensure the path is correct relative to the base URL
3. Restart your development server after configuration changes

### TypeScript errors

1. Ensure `baseUrl` is set correctly in `tsconfig.json`
2. Check that the `paths` mapping matches your directory structure
3. Run `npm run typecheck` to verify TypeScript configuration

### Build errors

1. Verify that the build tool configuration matches the TypeScript configuration
2. Check that all file paths use the correct URL resolution
3. Clear build cache if necessary