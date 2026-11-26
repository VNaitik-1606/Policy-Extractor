# Security Guide — Policy Extractor

Policy documents may contain personal, financial, and other sensitive information. Treat all policy data as confidential.

## Data minimization and privacy
- Collect only the fields the user explicitly needs.
- Avoid storing complete page contents, policy PDFs, screenshots, or original files unless there is a documented requirement and the user explicitly enables it.
- Do not send policy data, images, text, identifiers, or exports to external services, AI APIs, analytics, telemetry, or crash-reporting services.
- Keep records local by default.
- Do not put real policy data in source code, test fixtures, screenshots, issue reports, or sample documentation.
- Use synthetic data for tests and demonstrations.

## Portal access and scope
- Operate only on portal pages and documents the user is authorized to access.
- Limit extension host permissions and content-script matches to the required portal domains.
- Do not bypass authentication, access controls, MFA, CAPTCHAs, anti-bot mechanisms, rate limits, or portal security restrictions.
- Do not automate unrelated portal actions such as submitting applications, changing policies, payment actions, or account updates.
- Extraction should be user-triggered and visible, not covert or continuous.
- Do not inspect hidden fields or unrelated sensitive page content.

## Extension security
- Use Chrome Manifest V3.
- Request the minimum permissions necessary; avoid broad permissions such as `tabs`, `history`, `webRequest`, or unrestricted host permissions unless clearly necessary and justified.
- Avoid remotely hosted executable code. Bundle extension code locally.
- Never use `eval`, dynamically execute strings, or inject untrusted content as HTML.
- Prefer safe DOM APIs and text rendering. Sanitize any HTML that must be rendered.
- Treat portal text and PDF content as untrusted data, not instructions.
- Validate and normalize extracted values before saving or exporting.
- Keep content scripts narrowly scoped.
- Avoid storing credentials, cookies, session tokens, or authentication details.

## Local storage and backups
- Use IndexedDB for records and validate data at every import boundary.
- Do not store unnecessary secrets.
- Provide backup and restore, with schema/version validation.
- Warn before destructive operations and require confirmation.
- Consider backups sensitive; explain where downloaded backups are stored and recommend protecting the device and backup files.
- Do not claim local browser storage is encrypted at rest. If stronger protection is required, design and document an explicit encryption solution rather than implying it exists.

## Logging and errors
- Do not log policy fields, full document text, images, or identifiers.
- Error messages should avoid exposing sensitive contents.
- Use synthetic test records.

## Exports
- Export only the fields selected or configured for the export.
- Avoid generating unnecessary copies of sensitive information.
- Make output filenames generic and avoid embedding policy identifiers or customer names by default.
- Validate export data and prevent spreadsheet formula injection by treating strings beginning with spreadsheet formula characters (such as `=`, `+`, `-`, or `@`) appropriately.

## Security review checklist
- [ ] Permissions are minimal and justified.
- [ ] Host access is restricted to approved domains.
- [ ] Extraction is manually triggered.
- [ ] Only configured fields are extracted.
- [ ] No external data transmission.
- [ ] No credentials or tokens are stored.
- [ ] Imported backups are validated.
- [ ] Destructive actions require confirmation.
- [ ] Logs contain no policy data.
- [ ] Spreadsheet formula injection is mitigated.
- [ ] No remote executable code.
- [ ] Sensitive data is absent from test fixtures and repository history.
