# Contributing Guide

> Standards, process, and expectations for contributing to 52-Patta.

---

## Getting Started

1. Read the [Dev Setup Guide](./dev-setup.md) to get the project running locally
2. Read the [Architecture](./architecture.md) doc to understand the system
3. Check the [TASKS.md](../TASKS.md) file for the current roadmap and open tasks

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `feature/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation changes |
| `refactor/<name>` | Code refactoring |

### Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run tests (see below)
4. Push and open a Pull Request against `main`

---

## Coding Standards

### JavaScript

- **No TypeScript yet** (incremental adoption planned for the game engine in EPIC 2)
- Use `const` by default, `let` when reassignment is needed, never `var`
- Use async/await over raw Promises where possible
- Use meaningful variable names (not single letters except in loops)

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `GameBoard.jsx` |
| Hooks | camelCase with `use` prefix | `useAuth.jsx` |
| Utilities | camelCase | `cardMapper.js` |
| Socket handlers | camelCase | `userJoinRoom.js` |
| Tests | Same name + `.test.js` | `scoring.test.js` |

### Directory Structure

- **Backend modules** export a single function or object from each file
- **Socket handlers** follow the pattern: export a higher-order function that takes `(socket, io)` and returns the event handler
- **React components** live in feature-based directories under `client/src/components/`

---

## Commit Messages

Follow this format:

```
<type>: <short description>

<optional body with more detail>
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `chore` | Build, config, dependency changes |
| `security` | Security-related changes |

### Examples

```
feat: add MendiKot game engine
fix: prevent double emit on room reconnection
refactor: extract bidding state machine from socket handler
docs: add socket event catalog
test: add unit tests for scoring module
security: harden Helmet CSP directives
```

---

## Pull Request Process

### PR Requirements

1. **Title:** Short and descriptive (under 70 chars)
2. **Description:** Include:
   - Summary of changes (what and why)
   - Test plan (how to verify)
   - Screenshots (for UI changes)
3. **Tests pass:** All existing tests must pass
4. **New tests:** Add tests for new functionality
5. **No secrets:** Never commit `.env`, credentials, or API keys

### PR Template

```markdown
## Summary
- Brief description of the changes

## Test Plan
- [ ] Run `npm test` — all pass
- [ ] Run `npm run test:integration` — all pass
- [ ] Manual testing steps (if applicable)

## Screenshots
(if UI changes)
```

### Review Checklist

- [ ] Code follows project conventions
- [ ] No console.log statements left in production code
- [ ] Error handling is present (try/catch in handlers)
- [ ] No sensitive data logged or exposed
- [ ] Input validation on all user-facing endpoints
- [ ] Socket events handle edge cases (disconnection, invalid data)

---

## Testing Requirements

### Before Submitting a PR

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration
```

### Writing Tests

**Unit tests** (Jest):
- Place in `tests/` directory
- Test game engine modules in isolation
- Test security invariants

**Integration tests** (Vitest):
- Place in `tests/integration/`
- Use `mongodb-memory-server` for database tests
- Test full flows (API + Socket interactions)

### Test Conventions

```js
describe('Module Name', () => {
    describe('functionName', () => {
        test('should do expected behavior', () => {
            // Arrange
            // Act
            // Assert
        });

        test('should handle edge case', () => {
            // ...
        });
    });
});
```

---

## Security Guidelines

Security is critical for this project. Follow these rules:

1. **Never commit secrets** — use `.env` for all credentials
2. **Validate all input** — both REST (express-validator) and Socket events (manual checks)
3. **Sanitize user content** — strip HTML tags from usernames and messages
4. **Use parameterized queries** — never build MongoDB queries from raw user input
5. **Don't log sensitive data** — no passwords, tokens, or full error stacks in production
6. **Keep dependencies updated** — check `npm audit` regularly

---

## Adding a New Game (EPIC 6 onwards)

When the plugin architecture (EPIC 2) is complete, new games should follow this pattern:

1. **Game engine module** in `game_engine/<game_name>/`
   - `config.js` — game variants and constants
   - `rules.js` — game-specific logic
   - Register with the game registry

2. **Socket handlers** in `socket_handlers/game_play/<game_name>/`
   - Follow existing handler patterns
   - Use the shared room management handlers

3. **Client components** in `client/src/components/<gameName>/`
   - Game-specific UI (board, hand, scoring)
   - Connect to Redux and socket events

4. **Tests** for the game engine and integration flows

---

## Getting Help

- Check existing [docs/](.) for architecture and API reference
- Look at similar code in the codebase for patterns
- Open an issue on GitHub for questions or proposals
