# Contributing to AI Watermark Remover

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/your-repo/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Python version, etc.)

### Suggesting Features

1. Check existing [Issues](https://github.com/your-repo/issues) for similar suggestions
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternative solutions considered
   - Additional context

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation
4. **Test locally**:
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   ```
5. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add video chunking for large files"
   ```
6. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** with:
   - Clear title
   - Description of changes
   - Link to related issues
   - Screenshots/videos for UI changes

## Development Setup

See [README.md](README.md#-quick-start-local-development) for local setup instructions.

## Code Style

### Python (Backend/Worker)
- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints
- Maximum line length: 100 characters
- Use `ruff` for linting:
  ```bash
  pip install ruff
  ruff check .
  ```

### TypeScript (Frontend)
- Follow [TypeScript style guide](https://google.github.io/styleguide/tsguide.html)
- Use ESLint configuration provided
- Run linter:
  ```bash
  npm run lint
  ```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding/updating tests
- `chore:` Maintenance tasks

Examples:
```bash
feat: add support for 4K video processing
fix: resolve S3 upload timeout issue
docs: update deployment guide for RunPod
```

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Start all services
./start-dev.sh

# Run integration tests
python tests/integration/test_e2e.py
```

## Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Update DEPLOYMENT.md for deployment process changes
- Add inline code comments for complex logic

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
