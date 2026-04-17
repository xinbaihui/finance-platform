# Architecture Notes

## Why model calls go through server

The mobile app could call the model API directly, but this project routes model
calls through the server on purpose.

Main reasons:

- keep `OPENAI_API_KEY` off the client
- centralize prompt and business-context assembly
- make it easier to add logging, rate limits, and guardrails
- support future chat memory, database reads, and multi-client reuse
