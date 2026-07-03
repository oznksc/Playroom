# Security Policy

## Supported Versions

Security fixes are accepted for the current `master` branch and active release
candidates. Older prototype snapshots are not supported unless maintainers
explicitly mark them as maintained.

## Reporting a Vulnerability

Do not open a public issue for vulnerabilities.

Report security issues using GitHub's private vulnerability reporting or by
contacting the maintainers through the repository owner profile. Include:

- Affected package or command.
- Reproduction steps.
- Impact and required privileges.
- Any known workaround.

We aim to acknowledge reports within 7 days. If the issue is valid, we will
coordinate a fix before public disclosure.

## Secret Handling

Playroom should not require committed secrets. Keep API keys in local developer
storage or environment-specific configuration. Do not commit `.env` files,
tokens, service account files, or private keys.
