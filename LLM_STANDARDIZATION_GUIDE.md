# LLM CSV Standardization Guide

This project expects input CSV files in a fixed format:

```csv
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-01-31,Groceries,50.00,Bank,Chequing,Main Account
2026-02-01,Restaurant,-35.50,Bank,Credit Card,Visa
```

If you use an LLM to transform raw bank exports or statement data into this format, treat that as a separate step outside this app.

## Security and Privacy

SplitCraft processes data locally, but an external LLM may not.

- Do not send raw statements to an LLM unless you understand that provider's data retention, training, logging, and access policies.
- Redact personally identifiable information before sharing any data with an LLM.
- Remove or mask account numbers, full names, addresses, emails, phone numbers, card numbers, customer IDs, and any other identifying metadata.
- Prefer sending only the minimum columns and rows needed for the transformation task.
- Review the model output carefully before importing it into this project.
- Keep a local copy of the original files so you can verify that dates, amounts, and account labels were not altered incorrectly.

## Recommended Workflow

1. Export your original transaction CSV or statement data locally.
2. Redact all PII and sensitive account details.
3. Provide the redacted data and the target schema to your LLM.
4. Review the generated CSV for correctness.
5. Save the final standardized CSV into `input/`.
6. Import it into SplitCraft.

## Suggested Prompt

Use this as a starting template and adjust it for your source files:

```text
I need help standardizing financial transaction data into a CSV format used by my local SplitCraft app.

Important constraints:
- I have already redacted personally identifiable information and sensitive account details.
- Do not infer or invent transactions, dates, amounts, institutions, or account names.
- Preserve the original transaction meaning.
- Output CSV only.
- Use exactly these columns and this exact order:
  Date,Description,Amount,Institution,Account_Type,Account_Name
- Date must be in YYYY-MM-DD format.
- Amount must be numeric with sign preserved exactly as provided in the source data.
- Institution should contain the bank or service name.
- Account_Type should be a normalized label such as Chequing, Savings, Credit Card, or Investment.
- Account_Name should be a short non-sensitive label for the account.
- If a value is missing or ambiguous, leave the field blank instead of guessing.
- Do not include markdown fences, commentary, notes, or explanations.

Here is the target output example:
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-01-31,Groceries,50.00,Bank,Chequing,Main Account
2026-02-01,Restaurant,-35.50,Bank,Credit Card,Visa

```

## Validation Checklist

Before importing the generated CSV, verify:

- The header row matches the required schema exactly.
- Dates are valid and consistently formatted as `YYYY-MM-DD`.
- Amount signs are correct.
- No extra commentary rows were added.
- No sensitive identifiers leaked into `Description` or `Account_Name`.
- The row count matches the source data you intended to convert.
