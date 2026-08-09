# Troubleshooting

No components are deployed yet, so there's nothing to troubleshoot. This documents the error
format to use once there is, per spec §60.

## Error format

Never: "Something went wrong."

Always:
```
<COMPONENT> CONNECTION FAILED
Cause: <specific cause, or "Cause unknown" if genuinely unknown — never fabricated>
Suggested fix: <concrete next step>
[RETRY]
```

## Known issues

None yet.
