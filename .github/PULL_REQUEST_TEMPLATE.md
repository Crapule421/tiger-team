## What this changes

<!-- One paragraph. Link the issue if there is one. -->

## Type

- [ ] Fact correction (cite the official source below)
- [ ] Knowledge base content
- [ ] Agent or command behaviour
- [ ] Deliverable template
- [ ] Confidentiality guard
- [ ] Documentation

## Sources

<!-- For any product or regulatory fact: the official documentation or legal text you read. -->

## Checklist

- [ ] No confidential material: fictitious names, documentation IP ranges, no secrets, nothing from a classified or Diffusion Restreinte context
- [ ] No French classification marking written in upper case (the guard would block reading the file)
- [ ] `bash tests/lint.sh` passes
- [ ] `bash tests/confidentiality-guard.test.sh` passes (if the guard changed)
- [ ] Tried with `claude --plugin-dir plugins/tiger-team` on the agent or command concerned
- [ ] `CHANGELOG.md` updated; version bumped in both manifests if the plugin content changed
