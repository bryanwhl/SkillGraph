# Security

SkillGraph Resolver will interact with remote skill repositories, so security must be part of the design from the beginning.

## MVP Security Requirements

- Never install a remote skill without user approval.
- Show source URL and install command before install.
- Do not execute scripts while indexing skills.
- Treat remote skill content as untrusted until approved.
- Track provenance for every installed skill.
- Support local-only mode.

## Future Security Ideas

- Organization allowlists.
- Source reputation scoring.
- Signed skill metadata.
- Deny lists for known-bad repositories.
- Static scanning for dangerous install scripts.
- Review workflow for graph relationships.

## Reporting Security Issues

This repository is in planning mode. Once implementation begins, this file should be updated with a private vulnerability reporting process.

