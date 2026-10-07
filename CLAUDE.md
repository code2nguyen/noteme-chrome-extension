<!-- c2n:start (managed by `npx c2n-skill install`, edits inside are replaced) -->

## UI components: use c2n (`c2-*` elements from `@c2n/*`)

This project builds its UI from the c2n web components. **Before writing any UI markup, use a `c2-*` element instead of a native element or a hand-rolled widget**, even when the task does not mention c2n:

- `<button>` → `c2-button` / `c2-icon-button`; `<input>` → `c2-text-field`, `c2-number-input`, `c2-date-input`, `c2-checkbox`, `c2-radio`, `c2-switch`, `c2-slider`; `<textarea>` → `c2-textarea`; `<select>` → `c2-select` / `c2-autocomplete`
- `<dialog>` → `c2-modal` / `c2-sheet`; `<details>` → `c2-details` / `c2-accordion`; `<progress>` → `c2-progress`; a data grid (sorting, selection, many rows) → `c2-table` (a short static `<table>` can stay native); tabs, menus, tooltips, toasts, cards, badges, pagination → their `c2-*` element
- Not listed here? Call the c2n MCP tool `search_components` before concluding none fits. Write plain HTML only when nothing fits, and say so.

Then:

- Never write a `c2-*` tag, attribute, slot, event or `--c2-*` variable from memory. Before using a component, call `get_component` for its API and `get_examples` for markup; call `get_theme` before writing CSS. Without the MCP tools, read `node_modules/@c2n/components/custom-elements.json`.
- Build the child elements a container expects: `get_component` lists them under "Children" (`c2-dashboard` holds `c2-dash-card`, `c2-tabs` holds `c2-tab`).
- Restyle a component only through its documented CSS variables, `--c2-<component>__<part>[__<state>]--<property>`, set on a class or the element. Do not put `border`, `padding`, `background`, `color` or size rules on a `c2-*` host, do not reach into its shadow DOM, and use `::part()` only for parts `get_component` lists.
- Theme once: import `@c2n/components/theme.css` at the app root and set `--c2-theme--*` tokens on `:root`.
- Before finishing, check what you wrote with the MCP tool `validate_markup` (or `npx -y @c2n/mcp validate src`) and fix what it reports. Mark a deliberate native element with a `c2n-ignore` comment.
- The `c2n-components` skill (`.claude/skills/c2n-components/SKILL.md`) has the full workflow.

<!-- c2n:end -->
