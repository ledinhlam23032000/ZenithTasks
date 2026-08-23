# AI Governance Research Findings

## Cerbos

Cerbos presents an open-source Policy Decision Point (PDP) that evaluates authorization requests against centralized policies. The useful architectural idea for ZenithTasks is to separate the decision “AI may propose this action” from application code and from the model itself. Policies should receive subject, action, resource and environment attributes, then return allow/deny plus reasons and obligations. This supports project-scoped RBAC/ABAC, sensitive-resource gates and consistent checks across tools.

Source: https://www.cerbos.dev/product-cerbos-pdp

## Langfuse

Langfuse describes an open-source, self-hostable AI engineering platform with traces, prompt version control, experiments, datasets, evaluations, user feedback and production monitoring. For ZenithTasks, the concept maps well to an internal AI Training Studio: maintain prompt/agent versions, curated training examples, evaluation datasets, human labels, regression runs and traces. It should complement—not replace—ZenithTasks’ own business policy, approval and audit tables.

Source: https://langfuse.com/docs

## OWASP Agentic Applications 2026

OWASP frames agentic systems as autonomous systems that plan, act and make decisions across workflows, and provides a peer-reviewed risk framework. ZenithTasks must explicitly address tool misuse, identity/privilege abuse, goal hijacking, excessive autonomy, sensitive-data exposure, missing approval and weak audit. A model response is never an authorization decision; every tool call must pass server-side policy and approval.

Source: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

## Design implications

The AI can be “đa năng” in breadth of tools, but not unlimited in authority. A user may request sensitive actions such as staff termination, medical-data display or system upgrades, yet the system must classify risk, show exact scope and consequence, require explicit confirmation, enforce two-person or time-delayed approval for selected actions, record the reason and preserve a rollback/audit trail. Medical access should be purpose-bound and minimum-necessary; employment actions should create a draft workflow and require documented approval rather than a one-command destructive mutation.

Tác giả: Manus AI.
