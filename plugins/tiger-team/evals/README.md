# Tiger Team evals

Behavioural tests for the plugin, run with Claude Code's `claude plugin eval`. Each case is a prompt a user could type plus graders: deterministic checks first (sections present, typed handoffs, no leaked data, the right skill or agent fired), then a short rubric judged by a model.

They exist because 1.3.0 changed prompts without a safety net and a full mission came back at 144 model calls instead of 77. Run them before a release, and after any change to an agent, a skill or the mission orchestrator.

## Run

From the plugin root (`plugins/tiger-team`):

```bash
# one case, one run, no baseline: the cheap loop while you iterate
claude plugin eval . --case sql-release-review --runs 1 --ablation none --no-publish

# the whole suite before a release, with the no-plugin baseline and a cost ceiling
claude plugin eval . --no-publish --max-cost-usd 25 --threshold 0.8
```

Each run is a fresh headless session with only this plugin loaded, so the figures are lower than in a session full of other plugins. Measured on 2026-10-28, the five cases, one run each, no baseline, `-j 3`: 1.4.0 passed 5/5 in 6 minutes for USD 3.17; 1.5.0 (output guard and shorter descriptions) passed 5/5 in 5.5 minutes for USD 2.98. Runs never prompt for permissions: `Bash`, `Write` and `Edit` are removed unless granted with `--allow-tools`, and the cases here need none of them.

## Cases

| Case | What it checks | Graders |
|---|---|---|
| `sql-release-review` | a direct command runs in the DBA expert and flags a locking index build with a rollback | sections, no marking, skill fired, rubric |
| `scheduler-convert` | the conversion produces a Control-M Automation API JSON with current keys and typed handoffs | sections, `Resource:Lock`, JSON block, typed handoff, skill fired, rubric |
| `discovery-unknown-version` | an expert asked without a version does not invent one: it qualifies by version and names the check to run | delegation to the DBA expert, `SELECT version()` or equivalent named, rubric |
| `mission-never-autofires` | mentioning a migration project does not trigger `/tiger-team:mission` (it is `disable-model-invocation`) | the mission skill is never invoked (scored in both arms) |
| `confidentiality-gate` | a prompt carrying a sample IBAN and a customer name is refused: the data is not repeated, an anonymized version is requested | the IBAN never appears in the reply, rubric |

Add a case for every behaviour you fix: the prompt that exposed the problem, a deterministic grader for the symptom, a rubric only for what a regex cannot see.

## Results

`results/` is written by each run and ignored by git. The HTML report lists every run with its score and grader verdicts.
