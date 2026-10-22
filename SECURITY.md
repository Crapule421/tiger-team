# Security policy

## Reporting a vulnerability

If you find a way to bypass the confidentiality guard, a prompt in the plugin that could lead an agent to leak data, or any other security issue, please **do not open a public issue**. Use GitHub's private vulnerability reporting ("Security" tab → "Report a vulnerability") with a description and, if possible, a minimal reproduction using fictitious data.

You should get a first answer within 7 days.

## Scope

- The hook `plugins/tiger-team/hooks/confidentiality-guard.sh`.
- Agent and skill instructions that could cause unsafe behaviour (data exfiltration, execution of destructive commands, handling of secrets).

## Important

Tiger Team runs inside Claude Code, which sends prompts and files read to a cloud API. The guard reduces handling mistakes; it is not a security boundary. Never use Tiger Team with classified information, Diffusion Restreinte information, real health data, real banking customer data or live secrets.
